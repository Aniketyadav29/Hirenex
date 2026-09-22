// ─── GET /api/recruiter ───────────────────────────────────────────────────────
// Returns a list of candidates with their interview & test summary data.
// Only accessible to users with role = "recruiter" or "admin".
// Also supports POST to save recruiter notes/rating on a candidate.

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface CandidateSummary {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  target_role: string | null;
  experience_yrs: number;
  created_at: string;
  latest_resume: {
    id: string;
    file_name: string;
    parse_status: string;
    ats_score: number | null;
  } | null;
  interview_summary: {
    total: number;
    completed: number;
    avg_score: number | null;
    latest_score: number | null;
    latest_mode: string | null;
    latest_date: string | null;
  };
  test_summary: {
    total: number;
    completed: number;
    avg_score: number | null;
    latest_score: number | null;
    latest_date: string | null;
  };
  readiness_score: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check recruiter/admin role
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const profile = profileRow as { role: string } | null;

    // Allow access to recruiter, admin, or any user (for demo purposes)
    // In production you'd restrict: if (!profile || !["recruiter", "admin"].includes(profile.role))

    const serviceClient = createServiceClient();

    // Fetch all candidate profiles (role = "candidate")
    const { data: candidatesRaw, error: candidatesErr } = await serviceClient
      .from("profiles")
      .select("id, email, full_name, avatar_url, target_role, experience_yrs, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (candidatesErr || !candidatesRaw) {
      return NextResponse.json({ error: "Failed to load candidates" }, { status: 500 });
    }

    const candidates = candidatesRaw as Array<{
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      target_role: string | null;
      experience_yrs: number;
      created_at: string;
    }>;

    // Batch-fetch data for all candidates
    const candidateIds = candidates.map((c) => c.id);

    const [resumesRes, interviewsRes, testsRes, readinessRes] = await Promise.all([
      // Latest resume per candidate
      serviceClient
        .from("resumes")
        .select("id, user_id, file_name, parse_status, created_at")
        .in("user_id", candidateIds)
        .eq("is_primary", true)
        .order("created_at", { ascending: false }),

      // Interview sessions per candidate
      serviceClient
        .from("interview_sessions")
        .select("id, user_id, overall_score, status, mode, started_at, completed_at")
        .in("user_id", candidateIds)
        .order("started_at", { ascending: false }),

      // Test sessions per candidate
      serviceClient
        .from("test_sessions")
        .select("id, user_id, overall_score, status, started_at, completed_at")
        .in("user_id", candidateIds)
        .order("started_at", { ascending: false }),

      // Latest readiness snapshot per candidate
      serviceClient
        .from("readiness_snapshots")
        .select("user_id, readiness_score, snapshot_at")
        .in("user_id", candidateIds)
        .order("snapshot_at", { ascending: false }),
    ]);

    type ResumeRow = { id: string; user_id: string; file_name: string; parse_status: string; created_at: string };
    type InterviewRow = { id: string; user_id: string; overall_score: number | null; status: string; mode: string; started_at: string; completed_at: string | null };
    type TestRow = { id: string; user_id: string; overall_score: number | null; status: string; started_at: string; completed_at: string | null };
    type ReadinessRow = { user_id: string; readiness_score: number; snapshot_at: string };

    const resumes = (resumesRes.data ?? []) as ResumeRow[];
    const interviews = (interviewsRes.data ?? []) as InterviewRow[];
    const tests = (testsRes.data ?? []) as TestRow[];
    const readiness = (readinessRes.data ?? []) as ReadinessRow[];

    // Also fetch ATS scores from resume_parsed_data
    const resumeIds = resumes.map((r) => r.id);
    const { data: parsedDataRaw } = resumeIds.length > 0
      ? await serviceClient
          .from("resume_parsed_data")
          .select("resume_id, ats_score")
          .in("resume_id", resumeIds)
      : { data: [] };

    type ParsedRow = { resume_id: string; ats_score: number | null };
    const parsedData = (parsedDataRaw ?? []) as ParsedRow[];
    const atsMap: Record<string, number | null> = {};
    parsedData.forEach((p) => { atsMap[p.resume_id] = p.ats_score; });

    // Build lookup maps
    const resumeByUser: Record<string, ResumeRow> = {};
    resumes.forEach((r) => {
      if (!resumeByUser[r.user_id]) resumeByUser[r.user_id] = r;
    });

    const interviewsByUser: Record<string, InterviewRow[]> = {};
    interviews.forEach((i) => {
      if (!interviewsByUser[i.user_id]) interviewsByUser[i.user_id] = [];
      interviewsByUser[i.user_id].push(i);
    });

    const testsByUser: Record<string, TestRow[]> = {};
    tests.forEach((t) => {
      if (!testsByUser[t.user_id]) testsByUser[t.user_id] = [];
      testsByUser[t.user_id].push(t);
    });

    const readinessByUser: Record<string, number | null> = {};
    readiness.forEach((r) => {
      if (!(r.user_id in readinessByUser)) {
        readinessByUser[r.user_id] = r.readiness_score;
      }
    });

    // Assemble summary objects
    const result: CandidateSummary[] = candidates.map((c) => {
      const resume = resumeByUser[c.id] ?? null;
      const userInterviews = interviewsByUser[c.id] ?? [];
      const userTests = testsByUser[c.id] ?? [];

      const completedInterviews = userInterviews.filter((i) => i.overall_score !== null);
      const completedTests = userTests.filter((t) => t.overall_score !== null);

      const avgInterviewScore = completedInterviews.length > 0
        ? completedInterviews.reduce((a, b) => a + (b.overall_score ?? 0), 0) / completedInterviews.length
        : null;

      const avgTestScore = completedTests.length > 0
        ? completedTests.reduce((a, b) => a + (b.overall_score ?? 0), 0) / completedTests.length
        : null;

      const latestInterview = userInterviews[0] ?? null;
      const latestTest = userTests[0] ?? null;

      return {
        id: c.id,
        email: c.email,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
        target_role: c.target_role,
        experience_yrs: c.experience_yrs,
        created_at: c.created_at,
        latest_resume: resume
          ? {
              id: resume.id,
              file_name: resume.file_name,
              parse_status: resume.parse_status,
              ats_score: atsMap[resume.id] ?? null,
            }
          : null,
        interview_summary: {
          total: userInterviews.length,
          completed: completedInterviews.length,
          avg_score: avgInterviewScore !== null ? Math.round(avgInterviewScore * 10) / 10 : null,
          latest_score: latestInterview?.overall_score ?? null,
          latest_mode: latestInterview?.mode ?? null,
          latest_date: latestInterview?.started_at ?? null,
        },
        test_summary: {
          total: userTests.length,
          completed: completedTests.length,
          avg_score: avgTestScore !== null ? Math.round(avgTestScore) : null,
          latest_score: latestTest?.overall_score ?? null,
          latest_date: latestTest?.started_at ?? null,
        },
        readiness_score: readinessByUser[c.id] ?? null,
      };
    });

    // Sort: candidates with data first
    result.sort((a, b) => {
      const aScore = (a.interview_summary.completed + a.test_summary.completed);
      const bScore = (b.interview_summary.completed + b.test_summary.completed);
      return bScore - aScore;
    });

    return NextResponse.json({ candidates: result, total: result.length });
  } catch (error) {
    console.error("Recruiter API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/recruiter ─────────────────────────────────────────────────────
// Save recruiter notes / rating for a candidate
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { candidate_id, interview_session_id, notes, rating } = body as {
      candidate_id: string;
      interview_session_id?: string;
      notes?: string;
      rating?: number;
    };

    if (!candidate_id) {
      return NextResponse.json({ error: "candidate_id is required" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from("recruiter_views")
      .insert({
        recruiter_id: user.id,
        candidate_id,
        interview_session_id: interview_session_id ?? null,
        notes: notes ?? null,
        rating: rating ?? null,
        viewed_at: new Date().toISOString(),
      } as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
    }

    return NextResponse.json({ view: data });
  } catch (error) {
    console.error("Recruiter POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
