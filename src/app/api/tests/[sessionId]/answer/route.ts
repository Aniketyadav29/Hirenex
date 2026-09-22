// ─── POST /api/tests/[sessionId]/answer ───────────────────────────────────────
// Submit an answer for a question, get feedback, complete session if last question

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface AnswerBody {
  question_id: string;
  user_answer: string;
  correct_answer: string;
  time_taken_secs: number;
  difficulty: "easy" | "medium" | "hard";
  is_last: boolean;
  answers_so_far: Array<{ is_correct: boolean }>;
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
    const body = (await request.json()) as AnswerBody;
    const { question_id, user_answer, correct_answer, time_taken_secs, difficulty, is_last, answers_so_far } = body;

    const is_correct = user_answer.trim().toLowerCase() === correct_answer.trim().toLowerCase();

    const serviceSupabase = createServiceClient();

    // ── Verify session belongs to user ──────────────────────────────────────
    const { data: sessionRaw } = await serviceSupabase
      .from("test_sessions")
      .select("id, user_id, total_questions")
      .eq("id", sessionId)
      .single();

    if (!sessionRaw) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const session = sessionRaw as { id: string; user_id: string; total_questions: number };
    if (session.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── Save answer ─────────────────────────────────────────────────────────
    await serviceSupabase.from("test_answers").insert({
      session_id: sessionId,
      question_id,
      user_answer,
      is_correct,
      time_taken_secs,
      difficulty_at_attempt: difficulty,
      created_at: new Date().toISOString(),
    } as never);

    // ── If last question, finalize session ──────────────────────────────────
    let overall_score: number | null = null;
    if (is_last) {
      const allAnswers = [...answers_so_far, { is_correct }];
      const correct = allAnswers.filter((a) => a.is_correct).length;
      overall_score = Math.round((correct / allAnswers.length) * 100);

      await serviceSupabase
        .from("test_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          overall_score,
        } as never)
        .eq("id", sessionId);
    }

    return NextResponse.json({
      is_correct,
      overall_score,
      session_complete: is_last,
    });
  } catch (error) {
    console.error("Answer submit error:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
