"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Briefcase,
  Calendar,
  Save,
  Loader2,
  CheckCircle2,
  Brain,
  ClipboardList,
  FileText,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import type { Profile } from "@/types/database";

interface StatsData {
  totalTests: number;
  avgTestScore: number | null;
  totalInterviews: number;
  avgInterviewScore: number | null;
  latestResume: { file_name: string; parse_status: string } | null;
}

const POPULAR_ROLES = [
  "Senior Full Stack Engineer",
  "Backend Systems Engineer",
  "Frontend Engineer",
  "AI / Machine Learning Engineer",
  "DevOps / Platform Engineer",
  "Data Engineer",
  "Mobile Engineer (iOS/Android)",
  "Engineering Manager",
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [experienceYrs, setExperienceYrs] = useState<number>(0);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (res.ok && data.profile) {
          setProfile(data.profile);
          setStats(data.stats);
          setFullName(data.profile.full_name || "");
          setTargetRole(data.profile.target_role || "");
          setExperienceYrs(data.profile.experience_yrs || 0);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          target_role: targetRole,
          experience_yrs: experienceYrs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setProfile(data.profile);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = (fullName || profile?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Loader2 size={36} className="animate-spin" style={{ color: "hsl(var(--primary))", margin: "0 auto 12px" }} />
        <p style={{ color: "hsl(var(--text-secondary))" }}>Loading your candidate profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 999,
            background: "hsl(var(--primary) / 0.1)",
            border: "1px solid hsl(var(--primary) / 0.25)",
            color: "hsl(var(--primary))",
            fontSize: "0.8rem",
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          <User size={14} />
          Account & Aspirations
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.1rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          Profile & Preferences
        </h1>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.95rem" }}>
          Configure your career goals, target seniority, and view your active performance metrics.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {/* Left Column: Avatar & Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, gridColumn: "span 2" }}>
          {/* Profile Card */}
          <div className="card" style={{ padding: 28 }}>
            {/* Header / Avatar Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                paddingBottom: 24,
                borderBottom: "1px solid hsl(var(--border))",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  boxShadow: "0 8px 24px hsl(var(--primary) / 0.35)",
                }}
              >
                {initials}
              </div>

              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: 4 }}>
                  {fullName || "Anonymous Candidate"}
                </h2>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "hsl(var(--text-secondary))",
                    fontSize: "0.88rem",
                  }}
                >
                  <Mail size={14} />
                  {profile?.email}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "hsl(var(--primary) / 0.15)",
                      color: "hsl(var(--primary))",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {profile?.role || "Candidate"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "hsl(142 71% 45% / 0.15)",
                      color: "hsl(142 71% 45%)",
                      fontWeight: 600,
                    }}
                  >
                    Active Account
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSave}>
              {errorMsg && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "hsl(0 84% 60% / 0.12)",
                    color: "hsl(0 84% 60%)",
                    fontSize: "0.88rem",
                    marginBottom: 16,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: 8,
                      color: "hsl(var(--text))",
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: 8,
                      color: "hsl(var(--text))",
                    }}
                  >
                    Total Experience (Years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={experienceYrs}
                    onChange={(e) => setExperienceYrs(parseInt(e.target.value) || 0)}
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(var(--text))" }}>
                    Target Job Role
                  </label>
                  <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-secondary))" }}>
                    Used for AI Interviewer & Tests
                  </span>
                </div>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="input"
                  style={{ width: "100%", marginBottom: 10 }}
                />

                {/* Popular Role Suggestions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {POPULAR_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setTargetRole(role)}
                      style={{
                        padding: "3px 9px",
                        borderRadius: 6,
                        fontSize: "0.75rem",
                        border: "1px solid hsl(var(--border))",
                        background: targetRole === role ? "hsl(var(--primary) / 0.15)" : "transparent",
                        color: targetRole === role ? "hsl(var(--primary))" : "hsl(var(--text-secondary))",
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: 24 }}>
                {savedSuccess && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "hsl(142 71% 45%)",
                      fontSize: "0.88rem",
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={16} /> Saved successfully!
                  </span>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px" }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Metrics Breakdown */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={18} style={{ color: "hsl(var(--primary))" }} />
              Active Assessment Performance
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "hsl(var(--muted))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <ClipboardList size={16} style={{ color: "hsl(258 90% 66%)" }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Skill Tests</span>
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                  {stats?.avgTestScore !== null && stats?.avgTestScore !== undefined ? `${stats.avgTestScore}%` : "—"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "hsl(var(--text-secondary))" }}>
                  {stats?.totalTests || 0} completed tests
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "hsl(var(--muted))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Brain size={16} style={{ color: "hsl(217 91% 60%)" }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>AI Interview Avg</span>
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                  {stats?.avgInterviewScore !== null && stats?.avgInterviewScore !== undefined
                    ? `${stats.avgInterviewScore}/10`
                    : "—"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "hsl(var(--text-secondary))" }}>
                  {stats?.totalInterviews || 0} sessions scored
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "hsl(var(--muted))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <FileText size={16} style={{ color: "hsl(142 71% 45%)" }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Resume Status</span>
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, textTransform: "capitalize" }}>
                  {stats?.latestResume?.parse_status || "None"}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "hsl(var(--text-secondary))",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stats?.latestResume?.file_name || "No resume uploaded"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
