// ─── POST /api/interview/[sessionId]/complete ─────────────────────────────────
// Finalizes an interview session — computes overall score, strengths, weaknesses

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { llmJSON } from "@/lib/llm/client";
import type { LLMMessage } from "@/lib/llm/client";

interface QARow {
  turn_index: number;
  question_text: string;
  answer_text: string | null;
  composite_score: number | null;
  feedback: string | null;
}

interface SummaryResult {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
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
    const body = await request.json() as { role: string };

    const serviceSupabase = createServiceClient();

    // ── Verify session belongs to user ──────────────────────────────────────
    const { data: sessionRaw } = await serviceSupabase
      .from("interview_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (!sessionRaw) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const session = sessionRaw as { id: string; user_id: string };
    if (session.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── Fetch all Q&A for this session ──────────────────────────────────────
    const { data: qaRaw } = await serviceSupabase
      .from("interview_qa")
      .select("turn_index, question_text, answer_text, composite_score, feedback")
      .eq("session_id", sessionId)
      .order("turn_index");

    const qa = (qaRaw as QARow[] | null) ?? [];
    const answered = qa.filter((q) => q.answer_text);

    // ── Compute average score ───────────────────────────────────────────────
    const scores = answered.map((q) => q.composite_score ?? 0).filter((s) => s > 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // ── LLM overall summary ─────────────────────────────────────────────────
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: "You are a senior recruiter summarizing a candidate's interview performance. Be constructive and specific. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Role applied for: "${body.role}"

Interview Q&A Summary:
${answered.map((q) => `Q${q.turn_index}: "${q.question_text}"\nScore: ${q.composite_score}/10\nFeedback: ${q.feedback}`).join("\n\n")}

Average score: ${avgScore.toFixed(1)}/10

Provide an overall interview assessment:
{
  "overall_score": ${avgScore.toFixed(1)} (number, 1-10, keep this close to the average),
  "strengths": ["3-4 specific strengths observed in the interview"],
  "weaknesses": ["2-3 areas that need improvement"],
  "summary": "A 2-3 sentence overall assessment paragraph"
}`,
      },
    ];

    const summary = await llmJSON<SummaryResult>(messages, { temperature: 0.3 });

    // ── Update interview session as completed ───────────────────────────────
    await serviceSupabase
      .from("interview_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        overall_score: summary.overall_score,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        summary: summary.summary,
        duration_secs: 0,
      } as never)
      .eq("id", sessionId);

    return NextResponse.json({ summary, session_id: sessionId });
  } catch (error) {
    console.error("Interview complete error:", error);
    return NextResponse.json({ error: "Failed to complete interview" }, { status: 500 });
  }
}
