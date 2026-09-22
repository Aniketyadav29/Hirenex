// ─── POST /api/interview/[sessionId]/video-respond ────────────────────────────
// Like /respond but for video mode:
//   - Accepts transcript (from Web Speech API) + presence_score (from browser heuristic)
//   - Stores video_url reference, scores content + presence
//   - Returns enhanced score breakdown

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { llmJSON } from "@/lib/llm/client";
import type { LLMMessage } from "@/lib/llm/client";
import { generateQuestion } from "@/app/api/interview/start/route";

interface VideoRespondBody {
  turn: number;
  question_text: string;
  question_type: string;
  answer_text: string;          // transcript from Web Speech API
  presence_score: number;       // 0–10 from browser PresenceMonitor
  video_url?: string;           // signed URL if already uploaded
  role: string;
  interview_type: string;
  total_questions: number;
  prev_questions: string[];
  job_description?: string;
}

interface ScoreResult {
  score_clarity: number;
  score_relevance: number;
  score_structure: number;
  score_confidence: number;
  score_accuracy: number;
  score_communication: number;
  composite_score: number;
  feedback: string;
  sample_answer: string;
}

interface VideoScoreResult extends ScoreResult {
  score_presence: number;
  video_composite_score: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await params;
    const body = (await request.json()) as VideoRespondBody;
    const {
      turn, question_text, question_type, answer_text, presence_score,
      video_url, role, interview_type, total_questions, prev_questions, job_description
    } = body;

    const serviceSupabase = createServiceClient();

    // Verify session
    const { data: sessionRaw } = await serviceSupabase
      .from("interview_sessions")
      .select("id, user_id, status")
      .eq("id", sessionId)
      .single();

    if (!sessionRaw) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const session = sessionRaw as { id: string; user_id: string; status: string };
    if (session.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Score the transcript with LLM
    const answerContent = answer_text?.trim() || "(No transcript available — candidate may have been silent)";

    const scoreMessages: LLMMessage[] = [
      {
        role: "system",
        content: `You are an expert ${interview_type} interviewer evaluating a candidate's spoken response (transcribed from video).
Score each dimension 1–10 (10 = perfect). Acknowledge if the transcript seems incomplete.
Return ONLY valid JSON.`,
      },
      {
        role: "user",
        content: `Role: ${role}
Interview type: ${interview_type}

Question (Turn ${turn}): "${question_text}"
Question type: ${question_type}

Candidate's Spoken Answer (transcript):
"${answerContent}"

Note: This was a VIDEO interview. The candidate spoke their answer aloud.

Score and provide feedback. Return:
{
  "score_clarity": number (1-10),
  "score_relevance": number (1-10),
  "score_structure": number (1-10),
  "score_confidence": number (1-10),
  "score_accuracy": number (1-10),
  "score_communication": number (1-10),
  "composite_score": number (1-10, weighted average of above),
  "feedback": "2-3 sentences of specific, actionable feedback on this spoken answer",
  "sample_answer": "A brief example of what a strong answer would include (2-4 sentences)"
}`,
      },
    ];

    const contentScores = await llmJSON<ScoreResult>(scoreMessages, { temperature: 0.3 });

    // Clamp presence score to 0–10
    const clampedPresence = Math.min(10, Math.max(0, Math.round(presence_score)));

    // Compute video composite (85% content + 15% presence)
    const videoComposite = Number(
      (contentScores.composite_score * 0.85 + clampedPresence * 0.15).toFixed(1)
    );

    const videoScores: VideoScoreResult = {
      ...contentScores,
      score_presence: clampedPresence,
      video_composite_score: videoComposite,
    };

    // Update interview_qa with answer + scores + video url
    await serviceSupabase
      .from("interview_qa")
      .update({
        answer_text: answerContent,
        answer_video_url: video_url || null,
        score_clarity: contentScores.score_clarity,
        score_relevance: contentScores.score_relevance,
        score_structure: contentScores.score_structure,
        score_confidence: contentScores.score_confidence,
        score_accuracy: contentScores.score_accuracy,
        score_communication: contentScores.score_communication,
        composite_score: videoComposite, // use video composite as the canonical score
        feedback: contentScores.feedback,
        sample_answer: contentScores.sample_answer,
      } as never)
      .eq("session_id", sessionId)
      .eq("turn_index", turn);

    const isLastQuestion = turn >= total_questions;

    // Generate next question if not last
    let nextQuestion = null;
    if (!isLastQuestion) {
      nextQuestion = await generateQuestion({
        role,
        interview_type,
        turn: turn + 1,
        total: total_questions,
        job_description,
        prev_questions,
        prev_answer: answer_text,
      });

      await serviceSupabase.from("interview_qa").insert({
        session_id: sessionId,
        turn_index: turn + 1,
        question_text: nextQuestion.question_text,
        question_type: nextQuestion.question_type,
        created_at: new Date().toISOString(),
      } as never);
    }

    return NextResponse.json({
      scores: videoScores,
      next_question: nextQuestion,
      is_complete: isLastQuestion,
      turn,
    });
  } catch (error) {
    console.error("Video respond error:", error);
    return NextResponse.json({ error: "Failed to process video response" }, { status: 500 });
  }
}
