// ─── POST /api/interview/start ────────────────────────────────────────────────
// Starts a new interview session and generates the opening question

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { llmJSON } from "@/lib/llm/client";
import type { LLMMessage } from "@/lib/llm/client";

export interface InterviewQuestion {
  question_text: string;
  question_type: "technical" | "behavioral" | "situational";
  follow_up_hint?: string;
}

interface StartBody {
  role: string;
  interview_type: "technical" | "behavioral" | "mixed";
  total_questions: number;
  job_description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as StartBody;
    const { role, interview_type, total_questions, job_description } = body;

    if (!role || !interview_type || !total_questions) {
      return NextResponse.json({ error: "role, interview_type, and total_questions are required" }, { status: 400 });
    }

    const numQ = Math.min(Math.max(total_questions, 3), 10);
    const serviceSupabase = createServiceClient();

    // ── Find job_role_id ────────────────────────────────────────────────────
    const { data: jobRoleRaw } = await serviceSupabase
      .from("job_roles")
      .select("id")
      .ilike("title", `%${role}%`)
      .limit(1)
      .maybeSingle();
    const jobRoleRecord = jobRoleRaw as { id: string } | null;

    // ── Create session ──────────────────────────────────────────────────────
    const { data: sessionRaw, error: sessionErr } = await serviceSupabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        job_role_id: jobRoleRecord?.id ?? null,
        mode: "text",
        interview_type,
        status: "in_progress",
        total_questions: numQ,
        started_at: new Date().toISOString(),
      } as never)
      .select()
      .single();

    if (sessionErr || !sessionRaw) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    const session = sessionRaw as { id: string };

    // ── Generate first question ─────────────────────────────────────────────
    const question = await generateQuestion({
      role,
      interview_type,
      turn: 1,
      total: numQ,
      job_description,
      prev_questions: [],
    });

    // ── Save first question to interview_qa ─────────────────────────────────
    await serviceSupabase.from("interview_qa").insert({
      session_id: session.id,
      turn_index: 1,
      question_text: question.question_text,
      question_type: question.question_type,
      created_at: new Date().toISOString(),
    } as never);

    return NextResponse.json({
      session_id: session.id,
      question,
      turn: 1,
      total_questions: numQ,
    });
  } catch (error) {
    console.error("Interview start error:", error);
    return NextResponse.json({ error: "Failed to start interview" }, { status: 500 });
  }
}

// ─── Shared LLM question generator ────────────────────────────────────────────
export async function generateQuestion(opts: {
  role: string;
  interview_type: string;
  turn: number;
  total: number;
  job_description?: string;
  prev_questions: string[];
  prev_answer?: string;
}): Promise<InterviewQuestion> {
  const { role, interview_type, turn, total, job_description, prev_questions, prev_answer } = opts;

  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `You are an expert ${interview_type} interviewer conducting a ${interview_type} interview for a ${role} position.
Your questions should be thoughtful, role-specific, and progressively challenging.
Return ONLY valid JSON with no markdown.`,
    },
    {
      role: "user",
      content: `Generate question ${turn} of ${total} for a ${interview_type} interview for: "${role}"
${job_description ? `Job Description: ${job_description.slice(0, 800)}` : ""}

Questions already asked (avoid repeating similar topics):
${prev_questions.map((q, i) => `${i + 1}. ${q}`).join("\n") || "None yet"}

${prev_answer ? `The candidate's previous answer was: "${prev_answer.slice(0, 400)}"` : ""}

Return JSON:
{
  "question_text": "The full interview question",
  "question_type": "technical" | "behavioral" | "situational",
  "follow_up_hint": "A brief hint about what a great answer should cover"
}

Guidelines:
- Question ${turn === 1 ? "should be a warm opener" : turn === total ? "should be a closing/reflection question" : "should dive into core competencies"}
- ${interview_type === "behavioral" ? "Use STAR method prompts (Situation, Task, Action, Result)" : ""}
- ${interview_type === "technical" ? "Include technical depth appropriate for the role level" : ""}
- Make it conversational, not robotic
- Question should require a 2-3 minute detailed answer`,
    },
  ];

  return llmJSON<InterviewQuestion>(messages, { temperature: 0.8 });
}
