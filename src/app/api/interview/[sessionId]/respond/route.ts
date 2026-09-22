// ─── POST /api/interview/[sessionId]/respond ──────────────────────────────────
// Submit a user answer, score it, and return the next question (or session end)

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { llmJSON } from "@/lib/llm/client";
import type { LLMMessage } from "@/lib/llm/client";
import { generateQuestion } from "@/app/api/interview/start/route";

interface RespondBody {
  turn: number;
  question_text: string;
  question_type: string;
  answer_text: string;
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await params;
    const body = (await request.json()) as RespondBody;
    const { turn, question_text, question_type, answer_text, role, interview_type, total_questions, prev_questions, job_description } = body;

    const serviceSupabase = createServiceClient();

    // ── Verify session ──────────────────────────────────────────────────────
    const { data: sessionRaw } = await serviceSupabase
      .from("interview_sessions")
      .select("id, user_id, status")
      .eq("id", sessionId)
      .single();

    if (!sessionRaw) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const session = sessionRaw as { id: string; user_id: string; status: string };
    if (session.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── Score the answer with LLM ───────────────────────────────────────────
    const scoreMessages: LLMMessage[] = [
      {
        role: "system",
        content: `You are an expert ${interview_type} interviewer evaluating a candidate's response.
Score each dimension 1–10 (10 = perfect). Be fair but rigorous.
Return ONLY valid JSON.`,
      },
      {
        role: "user",
        content: `Role: ${role}
Interview type: ${interview_type}

Question (Turn ${turn}): "${question_text}"
Question type: ${question_type}

Candidate's Answer:
"${answer_text}"

Score and provide feedback. Return:
{
  "score_clarity": number (1-10),
  "score_relevance": number (1-10),
  "score_structure": number (1-10),
  "score_confidence": number (1-10),
  "score_accuracy": number (1-10),
  "score_communication": number (1-10),
  "composite_score": number (1-10, weighted average),
  "feedback": "2-3 sentences of specific, actionable feedback on this answer",
  "sample_answer": "A brief example of what a strong answer would include (2-4 sentences)"
}`,
      },
    ];

    const scores = await llmJSON<ScoreResult>(scoreMessages, { temperature: 0.3 });

    // ── Update interview_qa with answer + scores ────────────────────────────
    await serviceSupabase
      .from("interview_qa")
      .update({
        answer_text,
        score_clarity: scores.score_clarity,
        score_relevance: scores.score_relevance,
        score_structure: scores.score_structure,
        score_confidence: scores.score_confidence,
        score_accuracy: scores.score_accuracy,
        score_communication: scores.score_communication,
        composite_score: scores.composite_score,
        feedback: scores.feedback,
        sample_answer: scores.sample_answer,
      } as never)
      .eq("session_id", sessionId)
      .eq("turn_index", turn);

    const isLastQuestion = turn >= total_questions;

    // ── Generate next question if not last ──────────────────────────────────
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

      // Save next question
      await serviceSupabase.from("interview_qa").insert({
        session_id: sessionId,
        turn_index: turn + 1,
        question_text: nextQuestion.question_text,
        question_type: nextQuestion.question_type,
        created_at: new Date().toISOString(),
      } as never);
    }

    return NextResponse.json({
      scores,
      next_question: nextQuestion,
      is_complete: isLastQuestion,
      turn,
    });
  } catch (error) {
    console.error("Interview respond error:", error);
    return NextResponse.json({ error: "Failed to process response" }, { status: 500 });
  }
}
