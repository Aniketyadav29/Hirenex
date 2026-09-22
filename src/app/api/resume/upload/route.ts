// ─── Resume Upload API Route ───────────────────────────────────────────────────
// POST /api/resume/upload
// Accepts multipart/form-data with 'file' field (PDF or DOCX)
// Extracts text, stores in Supabase Storage, triggers async background parsing

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

interface ResumeInsertRow {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  parse_status: string;
  is_primary: boolean;
  created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse multipart form ────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const makePrimary = formData.get("make_primary") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileType = fileExt === "pdf" ? "pdf" : fileExt === "docx" ? "docx" : null;

    if (!fileType) {
      return NextResponse.json({ error: "Only PDF and DOCX files are allowed" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
    }

    // ── Upload to Supabase Storage ──────────────────────────────────────────
    const storagePath = `resumes/${user.id}/${nanoid()}.${fileType}`;
    const bytes = await file.arrayBuffer();
    const serviceSupabase = createServiceClient();

    const { error: storageError } = await serviceSupabase.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });

    if (storageError) {
      console.error("Storage error:", storageError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const { data: urlData } = serviceSupabase.storage.from("documents").getPublicUrl(storagePath);

    // ── Unset existing primary if needed ────────────────────────────────────
    if (makePrimary) {
      await serviceSupabase
        .from("resumes")
        .update({ is_primary: false } as never)
        .eq("user_id", user.id)
        .eq("is_primary", true);
    }

    // ── Create resume record ────────────────────────────────────────────────
    const insertPayload = {
      user_id: user.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: fileType,
      parse_status: "pending",
      is_primary: makePrimary,
    };

    const { data: resumeRaw, error: dbError } = await serviceSupabase
      .from("resumes")
      .insert(insertPayload as never)
      .select()
      .single();

    if (dbError || !resumeRaw) {
      console.error("DB error:", dbError);
      return NextResponse.json({ error: "Failed to create resume record" }, { status: 500 });
    }

    const resumeRecord = resumeRaw as unknown as ResumeInsertRow;

    // ── Trigger async parsing ────────────────────────────────────────────────
    parseResumeAsync(resumeRecord.id, bytes, fileType as "pdf" | "docx", user.id).catch(
      (err) => console.error("Async parse error:", err)
    );

    return NextResponse.json({
      success: true,
      resume_id: resumeRecord.id,
      message: "Resume uploaded. Analysis will complete in ~30 seconds.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Background parse job ─────────────────────────────────────────────────────
async function parseResumeAsync(
  resumeId: string,
  fileBytes: ArrayBuffer,
  fileType: "pdf" | "docx",
  userId: string
) {
  const serviceSupabase = createServiceClient();

  await serviceSupabase
    .from("resumes")
    .update({ parse_status: "processing" } as never)
    .eq("id", resumeId);

  try {
    let rawText = "";

    if (fileType === "pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = Buffer.from(fileBytes);
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text;
    } else {
      const mammoth = await import("mammoth");
      const buffer = Buffer.from(fileBytes);
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    }

    await serviceSupabase
      .from("resumes")
      .update({ raw_text: rawText } as never)
      .eq("id", resumeId);

    const { parseResumeWithLLM, scoreATS } = await import("@/lib/resume/analyzer");
    const parsed = await parseResumeWithLLM(rawText);
    const ats = scoreATS(rawText, parsed);

    await serviceSupabase.from("resume_parsed_data").upsert({
      resume_id: resumeId,
      personal_info: parsed.personal_info,
      education: parsed.education,
      experience: parsed.experience,
      projects: parsed.projects,
      certifications: parsed.certifications,
      extracted_skills: parsed.skills,
      ats_score: ats.score,
      ats_feedback: ats.feedback,
      parsed_at: new Date().toISOString(),
    } as never);

    // Update skill profile
    await updateUserSkillProfile(userId, parsed.skills, serviceSupabase);

    await serviceSupabase
      .from("resumes")
      .update({ parse_status: "done", parsed_at: new Date().toISOString() } as never)
      .eq("id", resumeId);
  } catch (error) {
    console.error("Parse error:", error);
    await serviceSupabase
      .from("resumes")
      .update({ parse_status: "failed" } as never)
      .eq("id", resumeId);
  }
}

// ─── Upsert user skill profile from resume skills ────────────────────────────
async function updateUserSkillProfile(
  userId: string,
  skills: Array<{ skill: string; confidence: number }>,
  supabase: ReturnType<typeof createServiceClient>
) {
  for (const skill of skills) {
    const { data: skillRaw } = await supabase
      .from("skills")
      .select("id")
      .ilike("name", skill.skill)
      .single();

    if (!skillRaw) continue;
    const skillRecord = skillRaw as unknown as { id: string };

    await supabase.from("user_skill_profiles").upsert({
      user_id: userId,
      skill_id: skillRecord.id,
      confidence: skill.confidence,
      source_resume: skill.confidence,
      last_updated: new Date().toISOString(),
    } as never, { onConflict: "user_id,skill_id" });
  }
}
