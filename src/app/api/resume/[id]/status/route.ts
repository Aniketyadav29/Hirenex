// GET /api/resume/[id]/status
// Polls parse status and returns result data when done

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ResumeStatusRow {
  id: string;
  parse_status: string;
  file_name: string;
  created_at: string;
}

interface ParsedDataRow {
  ats_score: number | null;
  ats_feedback: unknown | null;
  extracted_skills: unknown | null;
  parsed_at: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch resume row
  const { data: resumeRaw, error: resumeError } = await supabase
    .from("resumes")
    .select("id, parse_status, file_name, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (resumeError || !resumeRaw) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const resume = resumeRaw as unknown as ResumeStatusRow;

  if (resume.parse_status !== "done") {
    return NextResponse.json({ status: resume.parse_status });
  }

  // Fetch parsed data
  const { data: parsedRaw } = await supabase
    .from("resume_parsed_data")
    .select("ats_score, ats_feedback, extracted_skills, parsed_at")
    .eq("resume_id", id)
    .single();

  const parsed = parsedRaw as unknown as ParsedDataRow | null;

  return NextResponse.json({
    status: "done",
    data: {
      resume_id: resume.id,
      ats_score: parsed?.ats_score ?? 0,
      ats_feedback: parsed?.ats_feedback ?? [],
      extracted_skills: parsed?.extracted_skills ?? [],
    },
  });
}
