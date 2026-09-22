// ─── POST /api/tests/generate ────────────────────────────────────────────────
// Creates a test session and generates MCQ questions via LLM
// Body: { role: string, topic?: string, difficulty: "easy"|"medium"|"hard", count: number }

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { llmJSON } from "@/lib/llm/client";
import type { LLMMessage } from "@/lib/llm/client";

export interface GeneratedQuestion {
  question_text: string;
  options: string[];       // exactly 4 options
  correct_answer: string;  // one of the 4 options
  explanation: string;
  topic_tags: string[];
  difficulty: "easy" | "medium" | "hard";
}

interface GenerateBody {
  role: string;
  topic?: string;
  difficulty: "easy" | "medium" | "hard";
  count: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as GenerateBody;
    const { role, topic, difficulty, count } = body;

    if (!role || !difficulty || !count) {
      return NextResponse.json({ error: "role, difficulty and count are required" }, { status: 400 });
    }

    const numQuestions = Math.min(Math.max(count, 3), 20);

    // ── Generate questions via LLM ──────────────────────────────────────────
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `You are an expert technical interviewer and assessment designer.
Generate high-quality multiple choice questions (MCQ) for technical skill assessment.
Each question must have exactly 4 options, one correct answer, and a clear explanation.
Return ONLY valid JSON — no markdown, no text outside the JSON.`,
      },
      {
        role: "user",
        content: `Generate ${numQuestions} ${difficulty} MCQ questions for a candidate applying for: "${role}"
${topic ? `Focus specifically on: ${topic}` : "Cover a broad range of relevant topics"}

Return JSON in this exact format:
{
  "questions": [
    {
      "question_text": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "...",
      "topic_tags": ["tag1", "tag2"],
      "difficulty": "${difficulty}"
    }
  ]
}

Rules:
- Questions must be practical and relevant to the role
- No trivially easy questions — challenge the candidate appropriately
- Options should be plausible (no obvious wrong answers)
- Explanations should teach something useful
- Vary question styles: conceptual, code-reading, scenario-based, best-practice`,
      },
    ];

    const generated = await llmJSON<{ questions: GeneratedQuestion[] }>(messages, {
      temperature: 0.7,
    });

    const questions = generated.questions.slice(0, numQuestions);

    // ── Find matching job_role_id ───────────────────────────────────────────
    const serviceSupabase = createServiceClient();
    const { data: jobRoleRaw } = await serviceSupabase
      .from("job_roles")
      .select("id")
      .ilike("title", `%${role}%`)
      .limit(1)
      .maybeSingle();

    const jobRoleRecord = jobRoleRaw as { id: string } | null;

    // ── Create test session ─────────────────────────────────────────────────
    const { data: sessionRaw, error: sessionErr } = await serviceSupabase
      .from("test_sessions")
      .insert({
        user_id: user.id,
        job_role_id: jobRoleRecord?.id ?? null,
        session_type: "adaptive",
        status: "in_progress",
        total_questions: questions.length,
        time_limit_mins: Math.ceil(questions.length * 2),
        started_at: new Date().toISOString(),
      } as never)
      .select()
      .single();

    if (sessionErr || !sessionRaw) {
      return NextResponse.json({ error: "Failed to create test session" }, { status: 500 });
    }

    const session = sessionRaw as { id: string };

    // ── Cache questions in question_bank ────────────────────────────────────
    const questionIds: string[] = [];
    for (const q of questions) {
      const { data: qRow } = await serviceSupabase
        .from("question_bank")
        .insert({
          job_role_id: jobRoleRecord?.id ?? null,
          question_text: q.question_text,
          question_type: "mcq",
          difficulty: q.difficulty,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          topic_tags: q.topic_tags,
          is_ai_generated: true,
          created_at: new Date().toISOString(),
        } as never)
        .select("id")
        .single();

      if (qRow) {
        const qRecord = qRow as { id: string };
        questionIds.push(qRecord.id);
      }
    }

    return NextResponse.json({
      session_id: session.id,
      questions: questions.map((q, i) => ({
        id: questionIds[i] ?? `q-${i}`,
        ...q,
      })),
      total: questions.length,
      time_limit_mins: Math.ceil(questions.length * 2),
    });
  } catch (error) {
    console.error("Test generate error:", error);
    return NextResponse.json({ error: "Failed to generate test" }, { status: 500 });
  }
}
