import { createClient } from "@/lib/supabase/server";
import {
  BarChart3,
  FileText,
  Brain,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

interface ResumeRow { id: string; parse_status: string; file_name: string; created_at: string; }
interface SessionRow { id: string; overall_score: number | null; status: string; started_at: string; }

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Demo mode: no user, return empty dashboard
  if (!user) {
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>
            Career Dashboard
          </h1>
          <p style={{ color: "hsl(var(--text-secondary))" }}>
            Connect your Supabase account to see your readiness scores and progress.
          </p>
        </div>
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", marginBottom: 12 }}>
            Demo Mode — No Data
          </h2>
          <p style={{ color: "hsl(var(--text-secondary))", maxWidth: 440, margin: "0 auto" }}>
            Add your Supabase credentials to <code>.env.local</code> and sign in to see your interview scores, skill tests, and career progress.
          </p>
        </div>
      </div>
    );
  }

  const [resumeRes, interviewRes, testRes] = await Promise.all([
    supabase.from("resumes").select("id, parse_status, file_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    supabase.from("interview_sessions").select("id, overall_score, status, started_at").eq("user_id", user.id).order("started_at", { ascending: false }).limit(5),
    supabase.from("test_sessions").select("id, overall_score, status, started_at").eq("user_id", user.id).order("started_at", { ascending: false }).limit(5),
  ]);

  const latestResume = (resumeRes.data as ResumeRow[] | null)?.[0] ?? null;
  const interviews = (interviewRes.data as SessionRow[] | null) ?? [];
  const tests = (testRes.data as SessionRow[] | null) ?? [];

  const completedInterviews = interviews.filter((i) => i.overall_score !== null);
  const completedTests = tests.filter((t) => t.overall_score !== null);

  const avgInterviewScore = completedInterviews.length > 0
    ? (completedInterviews.reduce((a, b) => a + (b.overall_score ?? 0), 0) / completedInterviews.length).toFixed(1)
    : null;

  const avgTestScore = completedTests.length > 0
    ? (completedTests.reduce((a, b) => a + (b.overall_score ?? 0), 0) / completedTests.length).toFixed(0)
    : null;

  const cards = [
    {
      label: "Resume Status",
      value: latestResume?.parse_status === "done" ? "Analyzed" : latestResume ? latestResume.parse_status : "None",
      sub: latestResume ? latestResume.file_name : "Upload your first resume",
      icon: FileText,
      color: "hsl(258 90% 66%)",
      href: "/resume",
    },
    {
      label: "Interview Avg Score",
      value: avgInterviewScore ? `${avgInterviewScore}/10` : "—",
      sub: `${interviews.filter((i) => i.status === "completed").length} sessions completed`,
      icon: Brain,
      color: "hsl(220 90% 56%)",
      href: "/interview",
    },
    {
      label: "Test Avg Score",
      value: avgTestScore ? `${avgTestScore}%` : "—",
      sub: `${tests.filter((t) => t.status === "completed").length} tests completed`,
      icon: ClipboardList,
      color: "hsl(142 72% 50%)",
      href: "/tests",
    },
    {
      label: "Readiness Score",
      value: "—",
      sub: "Complete all modules to unlock",
      icon: Target,
      color: "hsl(38 95% 64%)",
      href: "/roadmap",
    },
  ];

  const quickActions = [
    { href: "/resume", label: "Analyze Resume", icon: FileText, desc: "Upload PDF/DOCX for ATS + gap report" },
    { href: "/interview", label: "Start Interview", icon: Brain, desc: "Practice with AI interviewer" },
    { href: "/tests", label: "Take a Skill Test", icon: ClipboardList, desc: "Adaptive quiz for your target role" },
  ];

  type ActivityItem = SessionRow & { _type: "interview" | "test" };
  const allActivity: ActivityItem[] = [
    ...interviews.map((i) => ({ ...i, _type: "interview" as const })),
    ...tests.map((t) => ({ ...t, _type: "test" as const })),
  ].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()).slice(0, 6);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>
          Career Dashboard
        </h1>
        <p style={{ color: "hsl(var(--text-secondary))" }}>
          Track your readiness, scores, and progress toward your target role.
        </p>
      </div>

      {/* Score cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="card" style={{ padding: 24, textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${card.color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {card.label}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", fontWeight: 800, letterSpacing: "-0.02em", color: card.value === "—" ? "hsl(var(--text-muted))" : "hsl(var(--text-primary))", marginBottom: 6 }}>
                {card.value}
              </div>
              <div style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))" }}>{card.sub}</div>
            </Link>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Recent activity */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={18} style={{ color: "hsl(var(--color-primary-light))" }} />
            Recent Activity
          </h2>
          {allActivity.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <BarChart3 size={40} style={{ color: "hsl(var(--text-muted))", margin: "0 auto 16px" }} />
              <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.875rem" }}>
                No activity yet. Start with a resume upload or skill test.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allActivity.map((item) => (
                <div key={`${item._type}-${item.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "hsl(var(--bg-elevated))" }}>
                  {item._type === "interview"
                    ? <Brain size={15} style={{ color: "hsl(220 90% 56%)", flexShrink: 0 }} />
                    : <ClipboardList size={15} style={{ color: "hsl(142 72% 50%)", flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontSize: "0.85rem", color: "hsl(var(--text-secondary))" }}>
                    {item._type === "interview" ? "Interview session" : "Skill test"}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))" }}>
                    {item.overall_score !== null
                      ? `${item.overall_score}${item._type === "interview" ? "/10" : "%"}`
                      : item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={18} style={{ color: "hsl(var(--color-warning))" }} />
            Quick Start
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  borderRadius: "var(--radius-md)", background: "hsl(var(--bg-elevated))",
                  border: "1px solid hsl(var(--border-subtle))", textDecoration: "none",
                  transition: "all var(--transition-fast)",
                }}>
                  <Icon size={18} style={{ color: "hsl(var(--color-primary))", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--text-primary))", marginBottom: 2 }}>{action.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>{action.desc}</div>
                  </div>
                  <ArrowRight size={14} style={{ color: "hsl(var(--text-muted))", flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
