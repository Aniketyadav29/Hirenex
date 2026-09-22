// ─── /api/profile ─────────────────────────────────────────────────────────────
// Get and update candidate profile and career settings

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SessionScoreRow {
  id: string;
  overall_score: number | null;
  status: string;
}

interface ResumeRow {
  id: string;
  file_name: string;
  parse_status: string;
  created_at: string;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profileRaw, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get career stats
    const [resumesRes, testsRes, interviewsRes] = await Promise.all([
      supabase
        .from("resumes")
        .select("id, file_name, parse_status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("test_sessions")
        .select("id, overall_score, status")
        .eq("user_id", user.id),
      supabase
        .from("interview_sessions")
        .select("id, overall_score, status")
        .eq("user_id", user.id),
    ]);

    const testsData = (testsRes.data as unknown as SessionScoreRow[] | null) ?? [];
    const interviewsData = (interviewsRes.data as unknown as SessionScoreRow[] | null) ?? [];
    const resumesData = (resumesRes.data as unknown as ResumeRow[] | null) ?? [];

    const completedTests = testsData.filter((t) => t.overall_score !== null);
    const completedInterviews = interviewsData.filter((i) => i.overall_score !== null);

    const avgTestScore =
      completedTests.length > 0
        ? Math.round(
            completedTests.reduce((acc, t) => acc + (t.overall_score || 0), 0) /
              completedTests.length
          )
        : null;

    const avgInterviewScore =
      completedInterviews.length > 0
        ? Number(
            (
              completedInterviews.reduce((acc, i) => acc + (i.overall_score || 0), 0) /
              completedInterviews.length
            ).toFixed(1)
          )
        : null;

    return NextResponse.json({
      profile: profileRaw || {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || null,
        target_role: null,
        experience_yrs: 0,
        role: "candidate",
      },
      stats: {
        totalTests: completedTests.length,
        avgTestScore,
        totalInterviews: completedInterviews.length,
        avgInterviewScore,
        latestResume: resumesData[0] || null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { full_name, target_role, experience_yrs } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updates.full_name = full_name;
    if (target_role !== undefined) updates.target_role = target_role;
    if (experience_yrs !== undefined) {
      updates.experience_yrs = Math.max(0, parseInt(experience_yrs) || 0);
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update(updates as never)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
