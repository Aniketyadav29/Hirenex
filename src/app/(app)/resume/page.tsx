"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Star,
  TrendingUp,
  BookOpen,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
  X,
} from "lucide-react";

type ParseStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface GapItem {
  skill: string;
  importance: "required" | "preferred";
  user_level: "none" | "beginner" | "intermediate" | "advanced";
  gap_reason: string;
  severity: "high" | "medium" | "low";
  recommendations: Array<{
    type: string;
    title: string;
    platform?: string;
    url?: string;
    time_to_complete?: string;
    why_this: string;
  }>;
}

interface ResumeResult {
  resume_id: string;
  ats_score: number;
  ats_feedback: Array<{ issue: string; severity: string; suggestion: string }>;
  extracted_skills: Array<{ skill: string; category: string; confidence: number }>;
  overall_match_pct?: number;
  gaps?: GapItem[];
  strengths?: string[];
}

export default function ResumeAnalyzerPage() {
  const [status, setStatus] = useState<ParseStatus>("idle");
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  // ── Upload & poll for result ──────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!selectedFile) return;
    setStatus("uploading");
    setErrorMsg("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("make_primary", "true");

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Upload failed");
        setStatus("error");
        return;
      }

      setStatus("processing");
      setPollingId(data.resume_id);

      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(poll);
          setStatus("error");
          setErrorMsg("Analysis timed out. Please try again.");
          return;
        }

        const pollRes = await fetch(`/api/resume/${data.resume_id}/status`);
        const pollData = await pollRes.json();

        if (pollData.status === "done") {
          clearInterval(poll);
          setResult(pollData.data);
          setStatus("done");
        } else if (pollData.status === "failed") {
          clearInterval(poll);
          setStatus("error");
          setErrorMsg("Analysis failed. Please try a different file.");
        }
      }, 3000);
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please check your connection.");
    }
  }

  const severityColor = (s: string) => {
    if (s === "critical" || s === "high") return "hsl(var(--color-danger))";
    if (s === "warning" || s === "medium") return "hsl(var(--color-warning))";
    return "hsl(var(--color-info))";
  };

  const severityBg = (s: string) => {
    if (s === "critical" || s === "high") return "hsl(var(--color-danger) / 0.1)";
    if (s === "warning" || s === "medium") return "hsl(var(--color-warning) / 0.1)";
    return "hsl(var(--color-info) / 0.1)";
  };

  const atsScoreColor = (score: number) => {
    if (score >= 80) return "hsl(var(--color-success))";
    if (score >= 60) return "hsl(var(--color-warning))";
    return "hsl(var(--color-danger))";
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileText size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
              Resume Analyzer
            </h1>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.9rem" }}>
              Upload your resume for ATS scoring, skill extraction & gap analysis
            </p>
          </div>
        </div>
      </div>

      {/* ── Upload Section ── */}
      {status === "idle" || status === "error" ? (
        <div className="card" style={{ padding: 40, marginBottom: 32 }}>
          {/* Target role input */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 10, color: "hsl(var(--text-secondary))" }}>
              Target Job Role <span style={{ color: "hsl(var(--text-muted))", fontWeight: 400 }}>(optional — enables gap analysis)</span>
            </label>
            <input
              id="input-target-role"
              className="input"
              placeholder="e.g., Senior Backend Engineer, Frontend Developer, Data Scientist..."
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              style={{ maxWidth: 520 }}
            />
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? "active" : ""}`}
          >
            <input {...getInputProps()} id="input-resume-file" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: isDragActive ? "hsl(var(--color-primary) / 0.2)" : "hsl(var(--bg-elevated))",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all var(--transition-base)",
              }}>
                <Upload size={28} style={{ color: isDragActive ? "hsl(var(--color-primary))" : "hsl(var(--text-muted))" }} />
              </div>
              {selectedFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileText size={20} style={{ color: "hsl(var(--color-primary))" }} />
                  <span style={{ fontWeight: 600, color: "hsl(var(--text-primary))" }}>{selectedFile.name}</span>
                  <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.8rem" }}>
                    ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--text-muted))", padding: 2 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: "hsl(var(--text-primary))" }}>
                      {isDragActive ? "Drop your resume here" : "Drag & drop your resume"}
                    </p>
                    <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem" }}>
                      Supports PDF and DOCX · Max 10MB
                    </p>
                  </div>
                  <button className="btn btn-secondary btn-sm" type="button">
                    Browse Files
                  </button>
                </>
              )}
            </div>
          </div>

          {status === "error" && (
            <div style={{
              marginTop: 20, padding: "12px 16px", borderRadius: "var(--radius-md)",
              background: "hsl(var(--color-danger) / 0.1)",
              border: "1px solid hsl(var(--color-danger) / 0.3)",
              color: "hsl(var(--color-danger))", fontSize: "0.875rem",
              display: "flex", gap: 10, alignItems: "center",
            }}>
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
            <button
              id="btn-analyze-resume"
              className="btn btn-primary btn-lg"
              onClick={handleAnalyze}
              disabled={!selectedFile}
            >
              <Zap size={20} />
              Analyze Resume
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Processing State ── */}
      {(status === "uploading" || status === "processing") && (
        <div className="card" style={{ padding: 60, textAlign: "center", marginBottom: 32 }}>
          <Loader2
            size={52}
            className="animate-spin-slow"
            style={{ color: "hsl(var(--color-primary))", margin: "0 auto 24px" }}
          />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700, marginBottom: 12 }}>
            {status === "uploading" ? "Uploading your resume..." : "Analyzing with AI..."}
          </h3>
          <p style={{ color: "hsl(var(--text-secondary))", maxWidth: 420, margin: "0 auto", lineHeight: 1.7 }}>
            {status === "uploading"
              ? "Securely uploading your file to our servers."
              : "Our AI is parsing your resume, scoring ATS compatibility, extracting skills, and identifying gaps. This takes ~30 seconds."}
          </p>

          {status === "processing" && (
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12, maxWidth: 360, margin: "32px auto 0" }}>
              {[
                "Extracting text content",
                "Identifying skills & experience",
                "Scoring ATS compatibility",
                "Generating gap analysis",
              ].map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 12, color: "hsl(var(--text-secondary))", fontSize: "0.875rem" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "hsl(var(--color-primary) / 0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Loader2 size={12} style={{ color: "hsl(var(--color-primary))", animation: `spin 1s linear ${i * 0.2}s infinite` }} />
                  </div>
                  {step}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {status === "done" && result && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* ATS Score Hero */}
          <div
            className="card"
            style={{
              padding: 36,
              background: "linear-gradient(135deg, hsl(var(--bg-surface)), hsl(var(--bg-elevated)))",
              border: "1px solid hsl(var(--border-default))",
            }}
          >
            <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
              {/* Score ring */}
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <svg width={120} height={120} viewBox="0 0 120 120">
                  <circle cx={60} cy={60} r={52} fill="none" stroke="hsl(var(--bg-overlay))" strokeWidth={10} />
                  <circle
                    cx={60} cy={60} r={52}
                    fill="none"
                    stroke={atsScoreColor(result.ats_score)}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={`${(result.ats_score / 100) * 327} 327`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dasharray 1s ease" }}
                  />
                  <text x={60} y={56} textAnchor="middle" fill={atsScoreColor(result.ats_score)} fontSize={26} fontWeight={800} fontFamily="Outfit, sans-serif">
                    {result.ats_score}
                  </text>
                  <text x={60} y={74} textAnchor="middle" fill="hsl(var(--text-muted))" fontSize={11} fontFamily="Inter, sans-serif">
                    /100
                  </text>
                </svg>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", color: atsScoreColor(result.ats_score), marginTop: 8 }}>
                  ATS Score
                </p>
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>
                  {result.ats_score >= 80
                    ? "🎉 Excellent Resume!"
                    : result.ats_score >= 60
                    ? "✅ Good — A few improvements needed"
                    : "⚠️ Needs Significant Work"}
                </h2>
                <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 16 }}>
                  {result.ats_score >= 80
                    ? "Your resume is well-optimized for ATS systems. Focus on skill gap improvements to maximize interview chances."
                    : result.ats_score >= 60
                    ? "Your resume will pass most ATS filters. Address the issues below to improve your response rate."
                    : "Your resume may be filtered out by ATS systems before reaching a human. Prioritize the critical fixes below."}
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div className="badge badge-muted">
                    {result.extracted_skills?.length ?? 0} skills detected
                  </div>
                  {result.overall_match_pct !== undefined && (
                    <div className="badge badge-primary">
                      {result.overall_match_pct}% role match
                    </div>
                  )}
                  <div
                    className="badge"
                    style={{
                      background: result.ats_score >= 80 ? "hsl(var(--color-success) / 0.15)" : "hsl(var(--color-warning) / 0.15)",
                      color: result.ats_score >= 80 ? "hsl(var(--color-success))" : "hsl(var(--color-warning))",
                    }}
                  >
                    {result.ats_feedback?.filter((f) => f.severity === "critical").length ?? 0} critical issues
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => { setStatus("idle"); setSelectedFile(null); setResult(null); }}
              >
                Analyze Another
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* ATS Feedback */}
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <Target size={18} style={{ color: "hsl(var(--color-warning))" }} />
                ATS Issues
              </h3>
              {result.ats_feedback && result.ats_feedback.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {result.ats_feedback.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "var(--radius-md)",
                        background: severityBg(item.severity),
                        border: `1px solid ${severityColor(item.severity)}30`,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                        <AlertCircle size={14} style={{ color: severityColor(item.severity), flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontWeight: 600, fontSize: "0.82rem", color: severityColor(item.severity) }}>
                          {item.issue}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-secondary))", lineHeight: 1.5, paddingLeft: 22 }}>
                        {item.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "hsl(var(--text-muted))", padding: "20px 0" }}>
                  <CheckCircle size={32} style={{ color: "hsl(var(--color-success))", margin: "0 auto 12px" }} />
                  <p>No ATS issues found!</p>
                </div>
              )}
            </div>

            {/* Extracted Skills */}
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={18} style={{ color: "hsl(var(--color-success))" }} />
                Detected Skills
              </h3>
              {result.extracted_skills && result.extracted_skills.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.extracted_skills.map((skill) => (
                    <div
                      key={skill.skill}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 99,
                        background: `hsl(var(--color-primary) / ${skill.confidence * 0.25 + 0.05})`,
                        border: `1px solid hsl(var(--color-primary) / ${skill.confidence * 0.4 + 0.1})`,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "hsl(var(--color-primary-light))",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {skill.skill}
                      <span style={{ opacity: 0.7, fontSize: "0.7rem" }}>
                        {Math.round(skill.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.875rem" }}>No skills extracted.</p>
              )}
            </div>
          </div>

          {/* Skill Gap Analysis */}
          {result.gaps && result.gaps.length > 0 && (
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 10 }}>
                  <TrendingUp size={20} style={{ color: "hsl(var(--color-accent))" }} />
                  Skill Gap Analysis
                </h3>
                {result.overall_match_pct !== undefined && (
                  <div style={{
                    padding: "6px 16px",
                    borderRadius: 99,
                    background: "hsl(var(--color-primary) / 0.12)",
                    border: "1px solid hsl(var(--color-primary) / 0.25)",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "hsl(var(--color-primary-light))",
                  }}>
                    {result.overall_match_pct}% match
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {result.gaps.map((gap) => (
                  <div
                    key={gap.skill}
                    className="card-elevated"
                    style={{ padding: 0, overflow: "hidden" }}
                  >
                    {/* Gap header */}
                    <button
                      onClick={() => setExpandedGap(expandedGap === gap.skill ? null : gap.skill)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "16px 20px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: severityColor(gap.severity),
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{gap.skill}</span>
                          <span
                            className="badge"
                            style={{
                              background: severityBg(gap.importance === "required" ? "critical" : "warning"),
                              color: severityColor(gap.importance === "required" ? "critical" : "warning"),
                              fontSize: "0.68rem",
                            }}
                          >
                            {gap.importance}
                          </span>
                          <span className="badge badge-muted" style={{ fontSize: "0.68rem" }}>
                            {gap.user_level === "none" ? "Not found in resume" : gap.user_level}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-secondary))", lineHeight: 1.5 }}>
                          {gap.gap_reason}
                        </p>
                      </div>
                      {expandedGap === gap.skill ? <ChevronUp size={16} style={{ color: "hsl(var(--text-muted))", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "hsl(var(--text-muted))", flexShrink: 0 }} />}
                    </button>

                    {/* Expanded recommendations */}
                    {expandedGap === gap.skill && (
                      <div style={{
                        padding: "0 20px 20px 42px",
                        borderTop: "1px solid hsl(var(--border-subtle))",
                        paddingTop: 16,
                      }}>
                        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--text-muted))", marginBottom: 12, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                          Recommended Resources
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {gap.recommendations.map((rec, i) => (
                            <div
                              key={i}
                              style={{
                                padding: "12px 16px",
                                borderRadius: "var(--radius-md)",
                                background: "hsl(var(--bg-overlay))",
                                display: "flex",
                                gap: 12,
                                alignItems: "flex-start",
                              }}
                            >
                              <BookOpen size={15} style={{ color: "hsl(var(--color-primary))", flexShrink: 0, marginTop: 2 }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "hsl(var(--text-primary))" }}>{rec.title}</span>
                                  {rec.platform && (
                                    <span className="badge badge-muted" style={{ fontSize: "0.68rem" }}>{rec.platform}</span>
                                  )}
                                  {rec.time_to_complete && (
                                    <span className="badge badge-muted" style={{ fontSize: "0.68rem" }}>{rec.time_to_complete}</span>
                                  )}
                                </div>
                                <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-secondary))", lineHeight: 1.5 }}>{rec.why_this}</p>
                              </div>
                              {rec.url && (
                                <a href={rec.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: "4px 8px", flexShrink: 0 }}>
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {result.strengths && result.strengths.length > 0 && (
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={18} style={{ color: "hsl(var(--color-success))" }} />
                Your Strengths
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.strengths.map((s) => (
                  <span key={s} className="badge badge-success" style={{ fontSize: "0.8rem" }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
