"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Brain,
  ClipboardList,
  FileText,
  Search,
  Star,
  TrendingUp,
  Target,
  Trophy,
  Loader2,
  AlertCircle,
  ChevronRight,
  Calendar,
  Briefcase,
  BarChart3,
  Filter,
  SortAsc,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Sparkles,
  Download,
  RefreshCw,
  Video,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface ResumeSummary {
  id: string;
  file_name: string;
  parse_status: string;
  ats_score: number | null;
}

interface InterviewSummary {
  total: number;
  completed: number;
  avg_score: number | null;
  latest_score: number | null;
  latest_mode: string | null;
  latest_date: string | null;
}

interface TestSummary {
  total: number;
  completed: number;
  avg_score: number | null;
  latest_score: number | null;
  latest_date: string | null;
}

interface Candidate {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  target_role: string | null;
  experience_yrs: number;
  created_at: string;
  latest_resume: ResumeSummary | null;
  interview_summary: InterviewSummary;
  test_summary: TestSummary;
  readiness_score: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function getScoreColor(score: number, max = 10): string {
  const pct = score / max;
  if (pct >= 0.8) return "hsl(var(--color-success))";
  if (pct >= 0.6) return "hsl(var(--color-warning))";
  return "hsl(var(--color-danger))";
}

function getScoreBg(score: number, max = 10): string {
  const pct = score / max;
  if (pct >= 0.8) return "hsl(var(--color-success) / 0.12)";
  if (pct >= 0.6) return "hsl(var(--color-warning) / 0.12)";
  return "hsl(var(--color-danger) / 0.12)";
}

function getReadinessLabel(score: number | null): string {
  if (score === null) return "No data";
  if (score >= 80) return "Job-Ready";
  if (score >= 60) return "Near Ready";
  if (score >= 40) return "Developing";
  return "Early Stage";
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

// ─── Score Badge ────────────────────────────────────────────────────────────────
function ScoreBadge({
  score,
  max = 10,
  suffix = "",
  label,
}: {
  score: number | null;
  max?: number;
  suffix?: string;
  label: string;
}) {
  if (score === null) {
    return (
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "hsl(var(--text-muted))",
            fontFamily: "var(--font-display)",
          }}
        >
          —
        </div>
        <div style={{ fontSize: "0.68rem", color: "hsl(var(--text-muted))", marginTop: 2 }}>{label}</div>
      </div>
    );
  }

  const color = getScoreColor(score, max);
  const bg = getScoreBg(score, max);

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 48,
          height: 48,
          borderRadius: 12,
          background: bg,
          border: `1.5px solid ${color}40`,
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "1rem",
          color,
          marginBottom: 4,
        }}
      >
        {score}
        {suffix}
      </div>
      <div style={{ fontSize: "0.68rem", color: "hsl(var(--text-muted))" }}>{label}</div>
    </div>
  );
}

// ─── Candidate Card ──────────────────────────────────────────────────────────────
function CandidateCard({
  candidate,
  onSelect,
  isSelected,
}: {
  candidate: Candidate;
  onSelect: (c: Candidate) => void;
  isSelected: boolean;
}) {
  const hasActivity =
    candidate.interview_summary.completed > 0 || candidate.test_summary.completed > 0;

  return (
    <div
      onClick={() => onSelect(candidate)}
      style={{
        background: isSelected
          ? "hsl(var(--bg-elevated))"
          : "hsl(var(--bg-surface))",
        border: `1px solid ${isSelected ? "hsl(var(--color-primary) / 0.4)" : "hsl(var(--border-subtle))"}`,
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        cursor: "pointer",
        transition: "all var(--transition-base)",
        boxShadow: isSelected ? "0 0 0 2px hsl(var(--color-primary) / 0.2)" : "none",
        position: "relative",
        overflow: "hidden",
      }}
      className="card-hover"
    >
      {/* Selected indicator */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 3,
            height: "100%",
            background: "var(--gradient-brand)",
            borderRadius: "3px 0 0 3px",
          }}
        />
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        {/* Avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "var(--gradient-brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1rem",
            color: "white",
            flexShrink: 0,
            fontFamily: "var(--font-display)",
          }}
        >
          {getInitials(candidate.full_name, candidate.email)}
        </div>

        {/* Name & role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.92rem",
              color: "hsl(var(--text-primary))",
              fontFamily: "var(--font-display)",
              marginBottom: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {candidate.full_name ?? candidate.email.split("@")[0]}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-muted))",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {candidate.email}
          </div>
          {candidate.target_role && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 5,
                padding: "2px 8px",
                borderRadius: 20,
                background: "hsl(var(--color-primary) / 0.12)",
                border: "1px solid hsl(var(--color-primary) / 0.2)",
              }}
            >
              <Briefcase size={10} style={{ color: "hsl(var(--color-primary))" }} />
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: "hsl(var(--color-primary))",
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {candidate.target_role}
              </span>
            </div>
          )}
        </div>

        {/* Readiness badge */}
        {candidate.readiness_score !== null && (
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              background:
                candidate.readiness_score >= 80
                  ? "hsl(var(--color-success) / 0.15)"
                  : candidate.readiness_score >= 60
                  ? "hsl(var(--color-warning) / 0.15)"
                  : "hsl(var(--bg-overlay))",
              border: `1px solid ${
                candidate.readiness_score >= 80
                  ? "hsl(var(--color-success) / 0.3)"
                  : candidate.readiness_score >= 60
                  ? "hsl(var(--color-warning) / 0.3)"
                  : "hsl(var(--border-subtle))"
              }`,
              fontSize: "0.68rem",
              fontWeight: 700,
              color:
                candidate.readiness_score >= 80
                  ? "hsl(var(--color-success))"
                  : candidate.readiness_score >= 60
                  ? "hsl(var(--color-warning))"
                  : "hsl(var(--text-muted))",
              whiteSpace: "nowrap",
            }}
          >
            {candidate.readiness_score}% ready
          </div>
        )}
      </div>

      {/* Score row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          padding: "12px",
          background: "hsl(var(--bg-base))",
          borderRadius: "var(--radius-md)",
          marginBottom: 12,
        }}
      >
        <ScoreBadge
          score={candidate.interview_summary.avg_score}
          max={10}
          label="Interview"
        />
        <ScoreBadge
          score={candidate.test_summary.avg_score}
          max={100}
          suffix="%"
          label="Test Score"
        />
        <ScoreBadge
          score={candidate.latest_resume?.ats_score ?? null}
          max={100}
          suffix="%"
          label="ATS Score"
        />
      </div>

      {/* Activity row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: "0.72rem",
            color: "hsl(var(--text-muted))",
          }}
        >
          <Brain size={11} style={{ color: "hsl(220 90% 60%)" }} />
          {candidate.interview_summary.completed} interview{candidate.interview_summary.completed !== 1 ? "s" : ""}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: "0.72rem",
            color: "hsl(var(--text-muted))",
          }}
        >
          <ClipboardList size={11} style={{ color: "hsl(142 72% 50%)" }} />
          {candidate.test_summary.completed} test{candidate.test_summary.completed !== 1 ? "s" : ""}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: "0.72rem",
            color: "hsl(var(--text-muted))",
          }}
        >
          <Briefcase size={11} />
          {candidate.experience_yrs}yr{candidate.experience_yrs !== 1 ? "s" : ""} exp
        </div>
        {!hasActivity && (
          <div
            style={{
              fontSize: "0.72rem",
              color: "hsl(var(--text-muted))",
              fontStyle: "italic",
            }}
          >
            No assessments yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Candidate Detail Panel ──────────────────────────────────────────────────────
function CandidateDetailPanel({ candidate }: { candidate: Candidate }) {
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const overallReadiness =
    candidate.readiness_score !== null
      ? candidate.readiness_score
      : (() => {
          const parts: number[] = [];
          if (candidate.interview_summary.avg_score !== null)
            parts.push((candidate.interview_summary.avg_score / 10) * 100);
          if (candidate.test_summary.avg_score !== null)
            parts.push(candidate.test_summary.avg_score);
          if (candidate.latest_resume?.ats_score !== null && candidate.latest_resume?.ats_score !== undefined)
            parts.push(candidate.latest_resume.ats_score);
          return parts.length > 0
            ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
            : null;
        })();

  async function handleSaveReview() {
    setSaving(true);
    try {
      await fetch("/api/recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidate.id,
          notes: notes || null,
          rating: rating || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const metrics = [
    {
      icon: Brain,
      label: "Interview Avg",
      value: candidate.interview_summary.avg_score !== null ? `${candidate.interview_summary.avg_score}/10` : "—",
      sub: `${candidate.interview_summary.completed} of ${candidate.interview_summary.total} completed`,
      color: "hsl(220 90% 60%)",
      bg: "hsl(220 90% 60% / 0.12)",
    },
    {
      icon: ClipboardList,
      label: "Test Avg Score",
      value: candidate.test_summary.avg_score !== null ? `${candidate.test_summary.avg_score}%` : "—",
      sub: `${candidate.test_summary.completed} of ${candidate.test_summary.total} completed`,
      color: "hsl(142 72% 50%)",
      bg: "hsl(142 72% 50% / 0.12)",
    },
    {
      icon: FileText,
      label: "ATS Resume Score",
      value: candidate.latest_resume?.ats_score !== null && candidate.latest_resume?.ats_score !== undefined
        ? `${candidate.latest_resume.ats_score}%`
        : "—",
      sub: candidate.latest_resume?.file_name ?? "No resume uploaded",
      color: "hsl(258 90% 66%)",
      bg: "hsl(258 90% 66% / 0.12)",
    },
    {
      icon: Target,
      label: "Readiness Score",
      value: overallReadiness !== null ? `${overallReadiness}%` : "—",
      sub: getReadinessLabel(overallReadiness),
      color: overallReadiness !== null && overallReadiness >= 80
        ? "hsl(142 72% 50%)"
        : overallReadiness !== null && overallReadiness >= 60
        ? "hsl(38 95% 64%)"
        : "hsl(var(--text-muted))",
      bg: overallReadiness !== null && overallReadiness >= 80
        ? "hsl(142 72% 50% / 0.12)"
        : overallReadiness !== null && overallReadiness >= 60
        ? "hsl(38 95% 64% / 0.12)"
        : "hsl(var(--bg-overlay))",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Candidate header */}
      <div
        className="card"
        style={{ padding: 28, background: "linear-gradient(135deg, hsl(var(--bg-surface)), hsl(var(--bg-elevated)))" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "var(--gradient-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.4rem",
              color: "white",
              flexShrink: 0,
              fontFamily: "var(--font-display)",
              boxShadow: "0 8px 20px hsl(220 90% 56% / 0.3)",
            }}
          >
            {getInitials(candidate.full_name, candidate.email)}
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.3rem",
                letterSpacing: "-0.02em",
                color: "hsl(var(--text-primary))",
                marginBottom: 4,
              }}
            >
              {candidate.full_name ?? "Unnamed Candidate"}
            </h2>
            <div style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))", marginBottom: 8 }}>
              {candidate.email}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {candidate.target_role && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "hsl(var(--color-primary) / 0.12)",
                    border: "1px solid hsl(var(--color-primary) / 0.25)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "hsl(var(--color-primary))",
                  }}
                >
                  <Briefcase size={11} /> {candidate.target_role}
                </span>
              )}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "hsl(var(--bg-overlay))",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "hsl(var(--text-muted))",
                }}
              >
                <Calendar size={11} /> {candidate.experience_yrs}yr{candidate.experience_yrs !== 1 ? "s" : ""} experience
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "hsl(var(--bg-overlay))",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "hsl(var(--text-muted))",
                }}
              >
                Joined {formatDistanceToNow(new Date(candidate.created_at))} ago
              </span>
            </div>
          </div>

          {/* Readiness ring */}
          {overallReadiness !== null && (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <svg width={72} height={72} viewBox="0 0 72 72">
                <circle
                  cx={36}
                  cy={36}
                  r={28}
                  fill="none"
                  stroke="hsl(var(--bg-overlay))"
                  strokeWidth={7}
                />
                <circle
                  cx={36}
                  cy={36}
                  r={28}
                  fill="none"
                  stroke={
                    overallReadiness >= 80
                      ? "hsl(var(--color-success))"
                      : overallReadiness >= 60
                      ? "hsl(var(--color-warning))"
                      : "hsl(var(--color-danger))"
                  }
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeDasharray={`${(overallReadiness / 100) * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                  transform="rotate(-90 36 36)"
                  style={{ transition: "stroke-dasharray 0.8s ease" }}
                />
                <text
                  x={36}
                  y={40}
                  textAnchor="middle"
                  fill={
                    overallReadiness >= 80
                      ? "hsl(var(--color-success))"
                      : overallReadiness >= 60
                      ? "hsl(var(--color-warning))"
                      : "hsl(var(--color-danger))"
                  }
                  fontSize={14}
                  fontWeight={800}
                  fontFamily="Outfit, sans-serif"
                >
                  {overallReadiness}%
                </text>
              </svg>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "hsl(var(--text-muted))",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginTop: 2,
                }}
              >
                Readiness
              </div>
            </div>
          )}
        </div>

        {/* Score metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "hsl(var(--bg-base))",
                  border: "1px solid hsl(var(--border-subtle))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: m.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={13} style={{ color: m.color }} />
                  </div>
                  <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {m.label}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "1.25rem",
                    color: m.value === "—" ? "hsl(var(--text-muted))" : "hsl(var(--text-primary))",
                    letterSpacing: "-0.02em",
                    marginBottom: 2,
                  }}
                >
                  {m.value}
                </div>
                <div style={{ fontSize: "0.68rem", color: "hsl(var(--text-muted))" }}>
                  {m.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interview details */}
      <div className="card" style={{ padding: 24 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.95rem",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Brain size={16} style={{ color: "hsl(220 90% 60%)" }} />
          Interview History
        </h3>

        {candidate.interview_summary.total === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 16px",
              color: "hsl(var(--text-muted))",
              fontSize: "0.85rem",
            }}
          >
            <Brain size={28} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            No interview sessions yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              {[
                { label: "Total Sessions", value: candidate.interview_summary.total },
                { label: "Completed", value: candidate.interview_summary.completed },
                {
                  label: "Latest Score",
                  value: candidate.interview_summary.latest_score !== null
                    ? `${candidate.interview_summary.latest_score}/10`
                    : "—",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "hsl(var(--bg-elevated))",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "1.3rem",
                      color: "hsl(var(--text-primary))",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-muted))" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            {candidate.interview_summary.latest_date && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.75rem",
                  color: "hsl(var(--text-muted))",
                  padding: "8px 0",
                }}
              >
                <Calendar size={12} />
                Last interview {formatDistanceToNow(new Date(candidate.interview_summary.latest_date))} ago
                {candidate.interview_summary.latest_mode && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "hsl(var(--bg-overlay))",
                      marginLeft: 4,
                    }}
                  >
                    {candidate.interview_summary.latest_mode === "video" ? (
                      <Video size={10} />
                    ) : (
                      <MessageSquare size={10} />
                    )}
                    {candidate.interview_summary.latest_mode}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test details */}
      <div className="card" style={{ padding: 24 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.95rem",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ClipboardList size={16} style={{ color: "hsl(142 72% 50%)" }} />
          Skill Assessment History
        </h3>

        {candidate.test_summary.total === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 16px",
              color: "hsl(var(--text-muted))",
              fontSize: "0.85rem",
            }}
          >
            <ClipboardList size={28} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            No skill tests taken yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Total Tests", value: candidate.test_summary.total },
                { label: "Completed", value: candidate.test_summary.completed },
                {
                  label: "Avg Score",
                  value: candidate.test_summary.avg_score !== null
                    ? `${candidate.test_summary.avg_score}%`
                    : "—",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "hsl(var(--bg-elevated))",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "1.3rem",
                      color: "hsl(var(--text-primary))",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-muted))" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resume info */}
      {candidate.latest_resume && (
        <div className="card" style={{ padding: 24 }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.95rem",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FileText size={16} style={{ color: "hsl(258 90% 66%)" }} />
            Resume
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              background: "hsl(var(--bg-elevated))",
            }}
          >
            <FileText size={20} style={{ color: "hsl(258 90% 66%)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 2 }}>
                {candidate.latest_resume.file_name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.72rem",
                    color:
                      candidate.latest_resume.parse_status === "done"
                        ? "hsl(var(--color-success))"
                        : "hsl(var(--text-muted))",
                  }}
                >
                  {candidate.latest_resume.parse_status === "done" ? (
                    <CheckCircle size={11} />
                  ) : (
                    <XCircle size={11} />
                  )}
                  {candidate.latest_resume.parse_status}
                </div>
                {candidate.latest_resume.ats_score !== null && (
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: getScoreBg(candidate.latest_resume.ats_score, 100),
                      color: getScoreColor(candidate.latest_resume.ats_score, 100),
                    }}
                  >
                    ATS: {candidate.latest_resume.ats_score}%
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recruiter review */}
      <div className="card" style={{ padding: 24 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.95rem",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Star size={16} style={{ color: "hsl(38 95% 64%)" }} />
          Recruiter Review
        </h3>

        {/* Star rating */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "hsl(var(--text-secondary))", marginBottom: 8 }}>
            Rating
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n === rating ? 0 : n)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  transition: "transform var(--transition-fast)",
                }}
              >
                <Star
                  size={22}
                  fill={n <= rating ? "hsl(38 95% 64%)" : "none"}
                  style={{
                    color: n <= rating ? "hsl(38 95% 64%)" : "hsl(var(--border-default))",
                    transition: "all var(--transition-fast)",
                  }}
                />
              </button>
            ))}
            {rating > 0 && (
              <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))", alignSelf: "center", marginLeft: 6 }}>
                {["", "Poor", "Below avg", "Average", "Good", "Excellent"][rating]}
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "hsl(var(--text-secondary))", marginBottom: 8 }}>
            Notes
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add private notes about this candidate..."
            rows={4}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "hsl(var(--bg-base))",
              border: "1px solid hsl(var(--border-default))",
              borderRadius: "var(--radius-md)",
              color: "hsl(var(--text-primary))",
              fontSize: "0.85rem",
              fontFamily: "var(--font-sans)",
              resize: "vertical",
              outline: "none",
              transition: "border-color var(--transition-fast)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "hsl(var(--color-primary))")}
            onBlur={(e) => (e.target.style.borderColor = "hsl(var(--border-default))")}
          />
        </div>

        <button
          onClick={handleSaveReview}
          disabled={saving || (!notes && rating === 0)}
          className="btn btn-primary"
          style={{ gap: 8 }}
          id="btn-save-review"
        >
          {saving ? (
            <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
          ) : saved ? (
            <CheckCircle size={15} />
          ) : (
            <Star size={15} />
          )}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Review"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function RecruiterPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "interview" | "test" | "readiness">("recent");
  const [filterActivity, setFilterActivity] = useState<"all" | "active" | "inactive">("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/recruiter");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load candidates");
      setCandidates(data.candidates ?? []);
      if (data.candidates?.length > 0 && !selectedCandidate) {
        setSelectedCandidate(data.candidates[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Filter & sort candidates
  const filtered = candidates
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (c.full_name ?? "").toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.target_role ?? "").toLowerCase().includes(q);

      const hasActivity =
        c.interview_summary.completed > 0 || c.test_summary.completed > 0;
      const matchActivity =
        filterActivity === "all" ||
        (filterActivity === "active" && hasActivity) ||
        (filterActivity === "inactive" && !hasActivity);

      return matchSearch && matchActivity;
    })
    .sort((a, b) => {
      if (sortBy === "interview") {
        return (b.interview_summary.avg_score ?? -1) - (a.interview_summary.avg_score ?? -1);
      }
      if (sortBy === "test") {
        return (b.test_summary.avg_score ?? -1) - (a.test_summary.avg_score ?? -1);
      }
      if (sortBy === "readiness") {
        return (b.readiness_score ?? -1) - (a.readiness_score ?? -1);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const stats = {
    total: candidates.length,
    active: candidates.filter(
      (c) => c.interview_summary.completed > 0 || c.test_summary.completed > 0
    ).length,
    avgInterview:
      candidates.filter((c) => c.interview_summary.avg_score !== null).length > 0
        ? (
            candidates
              .filter((c) => c.interview_summary.avg_score !== null)
              .reduce((a, c) => a + (c.interview_summary.avg_score ?? 0), 0) /
            candidates.filter((c) => c.interview_summary.avg_score !== null).length
          ).toFixed(1)
        : null,
    avgTest:
      candidates.filter((c) => c.test_summary.avg_score !== null).length > 0
        ? Math.round(
            candidates
              .filter((c) => c.test_summary.avg_score !== null)
              .reduce((a, c) => a + (c.test_summary.avg_score ?? 0), 0) /
              candidates.filter((c) => c.test_summary.avg_score !== null).length
          )
        : null,
    topReady: candidates.filter((c) => (c.readiness_score ?? 0) >= 80).length,
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.8rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 6,
            }}
          >
            Recruiter Portal
          </h1>
          <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.9rem" }}>
            Review candidate profiles, interview reports, and assessment scores.
          </p>
        </div>
        <button
          onClick={fetchCandidates}
          className="btn btn-secondary"
          style={{ gap: 8, flexShrink: 0 }}
          id="btn-refresh-candidates"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Stats overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          {
            icon: Users,
            label: "Total Candidates",
            value: stats.total,
            color: "hsl(220 90% 60%)",
            bg: "hsl(220 90% 60% / 0.12)",
          },
          {
            icon: TrendingUp,
            label: "Active Candidates",
            value: stats.active,
            color: "hsl(142 72% 50%)",
            bg: "hsl(142 72% 50% / 0.12)",
          },
          {
            icon: Brain,
            label: "Avg Interview Score",
            value: stats.avgInterview !== null ? `${stats.avgInterview}/10` : "—",
            color: "hsl(258 90% 66%)",
            bg: "hsl(258 90% 66% / 0.12)",
          },
          {
            icon: ClipboardList,
            label: "Avg Test Score",
            value: stats.avgTest !== null ? `${stats.avgTest}%` : "—",
            color: "hsl(38 95% 64%)",
            bg: "hsl(38 95% 64% / 0.12)",
          },
          {
            icon: Trophy,
            label: "Job-Ready (≥80%)",
            value: stats.topReady,
            color: "hsl(var(--color-success))",
            bg: "hsl(var(--color-success) / 0.12)",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card"
              style={{ padding: "18px 20px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: stat.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={15} style={{ color: stat.color }} />
                </div>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "hsl(var(--text-muted))",
                  }}
                >
                  {stat.label}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "hsl(var(--text-primary))",
                }}
              >
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content: split view */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, alignItems: "start" }}>
        {/* Candidate list panel */}
        <div style={{ position: "sticky", top: 88 }}>
          {/* Search & filters */}
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "hsl(var(--bg-base))",
                border: "1px solid hsl(var(--border-default))",
                borderRadius: "var(--radius-md)",
                marginBottom: 12,
              }}
            >
              <Search size={15} style={{ color: "hsl(var(--text-muted))", flexShrink: 0 }} />
              <input
                id="input-candidate-search"
                type="text"
                placeholder="Search candidates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontSize: "0.85rem",
                  color: "hsl(var(--text-primary))",
                  fontFamily: "var(--font-sans)",
                }}
              />
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                {(["all", "active", "inactive"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterActivity(f)}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      borderRadius: 8,
                      border: "1px solid",
                      borderColor:
                        filterActivity === f
                          ? "hsl(var(--color-primary))"
                          : "hsl(var(--border-subtle))",
                      background:
                        filterActivity === f
                          ? "hsl(var(--color-primary) / 0.12)"
                          : "transparent",
                      color:
                        filterActivity === f
                          ? "hsl(var(--color-primary))"
                          : "hsl(var(--text-muted))",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                      textTransform: "capitalize",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                id="select-sort-candidates"
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border-subtle))",
                  background: "hsl(var(--bg-base))",
                  color: "hsl(var(--text-secondary))",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="recent">Recent</option>
                <option value="interview">Interview Score</option>
                <option value="test">Test Score</option>
                <option value="readiness">Readiness</option>
              </select>
            </div>
          </div>

          {/* Count */}
          <div
            style={{
              fontSize: "0.72rem",
              color: "hsl(var(--text-muted))",
              marginBottom: 10,
              padding: "0 4px",
              fontWeight: 600,
            }}
          >
            {filtered.length} of {candidates.length} candidates
          </div>

          {/* List */}
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 24px",
                gap: 16,
              }}
            >
              <Loader2
                size={32}
                style={{ color: "hsl(var(--color-primary))", animation: "spin 1s linear infinite" }}
              />
              <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.875rem" }}>
                Loading candidates…
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <AlertCircle size={32} style={{ color: "hsl(var(--color-danger))" }} />
              <div style={{ color: "hsl(var(--color-danger))", fontSize: "0.875rem" }}>
                {error}
              </div>
              <button onClick={fetchCandidates} className="btn btn-secondary" style={{ gap: 8 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 24px",
                color: "hsl(var(--text-muted))",
              }}
            >
              <Users size={40} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
              <p style={{ fontSize: "0.875rem" }}>
                {search ? "No candidates match your search" : "No candidates found"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((c) => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  onSelect={setSelectedCandidate}
                  isSelected={selectedCandidate?.id === c.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selectedCandidate ? (
            <CandidateDetailPanel candidate={selectedCandidate} />
          ) : (
            <div
              className="card"
              style={{
                padding: "80px 40px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "hsl(var(--bg-overlay))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Eye size={32} style={{ color: "hsl(var(--text-muted))" }} />
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "hsl(var(--text-primary))",
                }}
              >
                Select a Candidate
              </h2>
              <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.875rem", maxWidth: 300 }}>
                Click on a candidate from the list to view their detailed profile, scores, and interview history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
