"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  ChevronRight,
  Loader2,
  Sparkles,
  Send,
  MessageSquare,
  CheckCircle,
  Target,
  TrendingUp,
  RotateCcw,
  Star,
  AlertCircle,
  Lightbulb,
  Trophy,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Video,
  MessageCircle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type InterviewPhase = "setup" | "starting" | "interview" | "reviewing" | "results";

interface Question {
  question_text: string;
  question_type: "technical" | "behavioral" | "situational";
  follow_up_hint?: string;
}

interface ScoreResult {
  score_clarity: number;
  score_relevance: number;
  score_structure: number;
  score_confidence: number;
  score_accuracy: number;
  score_communication: number;
  composite_score: number;
  feedback: string;
  sample_answer: string;
}

interface ChatMessage {
  type: "question" | "answer" | "feedback";
  turn?: number;
  content: string;
  question_type?: string;
  scores?: ScoreResult;
  follow_up_hint?: string;
}

interface Summary {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

const ROLES = [
  "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
  "Data Scientist", "DevOps Engineer", "Machine Learning Engineer",
  "Product Manager", "UI/UX Designer", "Senior Backend Engineer",
  "Mobile Engineer (React Native)",
];

const INTERVIEW_TYPES = [
  { value: "technical", label: "Technical", icon: "⚙️", desc: "Coding, system design, tech concepts" },
  { value: "behavioral", label: "Behavioral", icon: "🤝", desc: "STAR stories, team dynamics, leadership" },
  { value: "mixed", label: "Mixed", icon: "🎯", desc: "Balanced technical + behavioral" },
] as const;

// ─── Score Ring Component ──────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label: string }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const color = score >= 8 ? "hsl(var(--color-success))" : score >= 6 ? "hsl(var(--color-warning))" : "hsl(var(--color-danger))";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--bg-overlay))" strokeWidth={7} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${(score / 10) * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color}
          fontSize={size * 0.22} fontWeight={800} fontFamily="Outfit, sans-serif">
          {score.toFixed(1)}
        </text>
      </svg>
      <div style={{ fontSize: "0.68rem", color: "hsl(var(--text-muted))", marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function InterviewPage() {
  const [phase, setPhase] = useState<InterviewPhase>("setup");

  // Setup
  const [selectedRole, setSelectedRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [interviewType, setInterviewType] = useState<"technical" | "behavioral" | "mixed">("mixed");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [jobDescription, setJobDescription] = useState("");
  const [showJD, setShowJD] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Interview state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [prevQuestions, setPrevQuestions] = useState<string[]>([]);

  // Per-answer feedback
  const [currentScores, setCurrentScores] = useState<ScoreResult | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Results
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, showFeedback]);

  const role = customRole.trim() || selectedRole;

  // ── Start interview ──────────────────────────────────────────────────────
  async function handleStart() {
    if (!role) { setErrorMsg("Please select or enter a role."); return; }
    setErrorMsg("");
    setPhase("starting");

    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          interview_type: interviewType,
          total_questions: totalQuestions,
          job_description: jobDescription || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to start interview.");
        setPhase("setup");
        return;
      }

      setSessionId(data.session_id);
      setCurrentTurn(1);
      setCurrentQuestion(data.question);
      setChatHistory([{
        type: "question",
        turn: 1,
        content: data.question.question_text,
        question_type: data.question.question_type,
        follow_up_hint: data.question.follow_up_hint,
      }]);
      setPrevQuestions([data.question.question_text]);
      setPhase("interview");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPhase("setup");
    }
  }

  // ── Submit answer ────────────────────────────────────────────────────────
  async function handleSubmitAnswer() {
    if (!answerDraft.trim() || submittingAnswer || !sessionId || !currentQuestion) return;
    setSubmittingAnswer(true);
    const answer = answerDraft.trim();
    setAnswerDraft("");

    // Add answer to chat
    setChatHistory((prev) => [...prev, { type: "answer", content: answer }]);

    try {
      const res = await fetch(`/api/interview/${sessionId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turn: currentTurn,
          question_text: currentQuestion.question_text,
          question_type: currentQuestion.question_type,
          answer_text: answer,
          role,
          interview_type: interviewType,
          total_questions: totalQuestions,
          prev_questions: prevQuestions,
          job_description: jobDescription || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Respond error:", data.error);
        setSubmittingAnswer(false);
        return;
      }

      // Show feedback for this answer
      setCurrentScores(data.scores);
      setShowFeedback(true);
      setChatHistory((prev) => [...prev, { type: "feedback", content: data.scores.feedback, scores: data.scores }]);

      if (data.is_complete) {
        setPhase("reviewing");
      } else {
        // Queue next question
        setCurrentQuestion(data.next_question);
        setPrevQuestions((prev) => [...prev, data.next_question.question_text]);
      }
    } catch {
      console.error("Submit answer failed");
    } finally {
      setSubmittingAnswer(false);
    }
  }

  // ── Move to next question (after reviewing feedback) ─────────────────────
  function handleContinue() {
    setCurrentScores(null);
    setShowFeedback(false);
    setCurrentTurn((t) => t + 1);

    if (currentQuestion && phase === "interview") {
      setChatHistory((prev) => [...prev, {
        type: "question",
        turn: currentTurn + 1,
        content: currentQuestion.question_text,
        question_type: currentQuestion.question_type,
        follow_up_hint: currentQuestion.follow_up_hint,
      }]);
    }
  }

  // ── Complete session ─────────────────────────────────────────────────────
  async function handleComplete() {
    if (!sessionId) return;
    setLoadingSummary(true);

    try {
      const res = await fetch(`/api/interview/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();

      if (res.ok) {
        setSummary(data.summary);
        setPhase("results");
      }
    } catch {
      console.error("Complete failed");
    } finally {
      setLoadingSummary(false);
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  function handleReset() {
    setPhase("setup");
    setSessionId(null);
    setCurrentTurn(1);
    setCurrentQuestion(null);
    setChatHistory([]);
    setAnswerDraft("");
    setPrevQuestions([]);
    setCurrentScores(null);
    setShowFeedback(false);
    setSummary(null);
    setErrorMsg("");
  }

  const qaHistory = chatHistory.filter((m) => m.type === "answer");

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "linear-gradient(135deg, hsl(220 90% 56%), hsl(258 90% 66%))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
                AI Virtual Interviewer
              </h1>
              <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.9rem" }}>
                Practice with an AI that asks dynamic questions and scores every answer in real time
              </p>
            </div>
          </div>

          {/* Mode Selector */}
          {phase === "setup" && (
            <div style={{ display: "flex", background: "hsl(var(--bg-elevated))", borderRadius: "var(--radius-lg)", padding: 4, border: "1px solid hsl(var(--border-subtle))" }}>
              <button
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
                  borderRadius: "var(--radius-md)", border: "none", cursor: "default",
                  background: "hsl(var(--color-primary) / 0.15)",
                  color: "hsl(var(--color-primary-light))",
                  fontWeight: 700, fontSize: "0.85rem",
                }}
              >
                <MessageCircle size={15} /> Text Mode
              </button>
              <Link
                href="/interview/video"
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
                  borderRadius: "var(--radius-md)", textDecoration: "none",
                  background: "transparent",
                  color: "hsl(var(--text-secondary))",
                  fontWeight: 600, fontSize: "0.85rem",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--bg-overlay))"; (e.currentTarget as HTMLElement).style.color = "hsl(var(--text-primary))"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "hsl(var(--text-secondary))"; }}
              >
                <Video size={15} /> Video Mode
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SETUP
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "setup" && (
        <div className="animate-fade-in">
          <div className="card" style={{ padding: 40 }}>
            {/* Role */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 14, fontSize: "0.95rem" }}>
                Target Role
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10, marginBottom: 14 }}>
                {ROLES.map((r) => (
                  <button key={r} onClick={() => { setSelectedRole(r); setCustomRole(""); }}
                    style={{
                      padding: "9px 14px", borderRadius: "var(--radius-md)",
                      border: `2px solid ${selectedRole === r && !customRole ? "hsl(var(--color-primary))" : "hsl(var(--border-subtle))"}`,
                      background: selectedRole === r && !customRole ? "hsl(var(--color-primary) / 0.12)" : "hsl(var(--bg-elevated))",
                      color: selectedRole === r && !customRole ? "hsl(var(--color-primary-light))" : "hsl(var(--text-secondary))",
                      cursor: "pointer", fontSize: "0.8rem", fontWeight: selectedRole === r && !customRole ? 700 : 500, textAlign: "left",
                      transition: "all var(--transition-fast)",
                    }}>
                    {r}
                  </button>
                ))}
              </div>
              <input className="input" placeholder="Or type a custom role..."
                value={customRole} onChange={(e) => { setCustomRole(e.target.value); setSelectedRole(""); }}
                style={{ maxWidth: 400 }} />
            </div>

            {/* Interview type */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 14, fontSize: "0.95rem" }}>
                Interview Type
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {INTERVIEW_TYPES.map((type) => (
                  <button key={type.value} onClick={() => setInterviewType(type.value)}
                    style={{
                      padding: "14px 20px", borderRadius: "var(--radius-md)", textAlign: "left",
                      border: `2px solid ${interviewType === type.value ? "hsl(var(--color-primary))" : "hsl(var(--border-subtle))"}`,
                      background: interviewType === type.value ? "hsl(var(--color-primary) / 0.12)" : "hsl(var(--bg-elevated))",
                      cursor: "pointer", transition: "all var(--transition-fast)", minWidth: 160,
                    }}>
                    <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>{type.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: interviewType === type.value ? "hsl(var(--color-primary-light))" : "hsl(var(--text-secondary))", marginBottom: 4 }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 14, fontSize: "0.95rem" }}>
                Number of Questions: <span style={{ color: "hsl(var(--color-primary-light))", fontFamily: "var(--font-mono)" }}>{totalQuestions}</span>
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {[3, 5, 7, 10].map((n) => (
                  <button key={n} onClick={() => setTotalQuestions(n)}
                    style={{
                      width: 52, height: 40, borderRadius: "var(--radius-md)",
                      border: `2px solid ${totalQuestions === n ? "hsl(var(--color-primary))" : "hsl(var(--border-subtle))"}`,
                      background: totalQuestions === n ? "hsl(var(--color-primary) / 0.12)" : "hsl(var(--bg-elevated))",
                      color: totalQuestions === n ? "hsl(var(--color-primary-light))" : "hsl(var(--text-secondary))",
                      fontWeight: 700, cursor: "pointer", transition: "all var(--transition-fast)",
                    }}>{n}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional JD */}
            <div style={{ marginBottom: 36 }}>
              <button onClick={() => setShowJD(!showJD)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--color-primary-light))", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: showJD ? 12 : 0 }}>
                <FileText size={14} />
                {showJD ? "Hide" : "Paste job description (optional)"}
                <ChevronRight size={14} style={{ transform: showJD ? "rotate(90deg)" : "none", transition: "transform var(--transition-fast)" }} />
              </button>
              {showJD && (
                <textarea className="input" placeholder="Paste the job description here to tailor questions..." value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  style={{ width: "100%", minHeight: 120, resize: "vertical", fontFamily: "var(--font-sans)", marginTop: 8 }} />
              )}
            </div>

            {errorMsg && (
              <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "hsl(var(--color-danger) / 0.1)", border: "1px solid hsl(var(--color-danger) / 0.3)", color: "hsl(var(--color-danger))", fontSize: "0.875rem", display: "flex", gap: 10, alignItems: "center" }}>
                <AlertCircle size={16} />{errorMsg}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button id="btn-start-interview" className="btn btn-primary btn-lg" onClick={handleStart}>
                <Sparkles size={20} />
                Start Interview
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Feature highlights */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
            {[
              { icon: MessageSquare, label: "Dynamic Questions", desc: "Adapts based on your answers", color: "hsl(var(--color-primary))" },
              { icon: Star, label: "6-Axis Scoring", desc: "Clarity, relevance, structure & more", color: "hsl(var(--color-accent))" },
              { icon: Lightbulb, label: "Sample Answers", desc: "Learn what great looks like", color: "hsl(var(--color-warning))" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="card" style={{ padding: "20px 24px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} style={{ color: item.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STARTING
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "starting" && (
        <div className="card animate-fade-in" style={{ padding: 80, textAlign: "center" }}>
          <Loader2 size={56} className="animate-spin-slow" style={{ color: "hsl(var(--color-primary))", margin: "0 auto 24px" }} />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, marginBottom: 12 }}>
            Preparing your interview...
          </h3>
          <p style={{ color: "hsl(var(--text-secondary))", maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
            Your AI interviewer is studying the role and crafting the perfect opening question. Ready in a moment.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INTERVIEW (Chat UI)
         ══════════════════════════════════════════════════════════════════════ */}
      {(phase === "interview" || phase === "reviewing") && (
        <div className="animate-fade-in">
          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 99, background: "hsl(var(--bg-elevated))", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, background: "var(--gradient-brand)",
                width: `${(Math.min(qaHistory.length, totalQuestions) / totalQuestions) * 100}%`,
                transition: "width var(--transition-base)",
              }} />
            </div>
            <span style={{ fontSize: "0.82rem", color: "hsl(var(--text-muted))", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{Math.min(qaHistory.length, totalQuestions)}</span> / {totalQuestions} answered
            </span>
          </div>

          {/* Chat window */}
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <div style={{
              padding: "12px 20px",
              borderBottom: "1px solid hsl(var(--border-subtle))",
              display: "flex", alignItems: "center", gap: 10,
              background: "hsl(var(--bg-elevated))",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>AI Interviewer</div>
                <div style={{ fontSize: "0.72rem", color: "hsl(var(--color-success))", display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(var(--color-success))" }} />
                  {role} · {interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview
                </div>
              </div>
            </div>

            <div style={{ maxHeight: 480, overflowY: "auto", padding: "24px 24px 8px" }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  {msg.type === "question" && (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        <Brain size={14} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "hsl(var(--text-muted))" }}>Q{msg.turn}</span>
                          {msg.question_type && (
                            <span className="badge badge-muted" style={{ fontSize: "0.68rem" }}>{msg.question_type}</span>
                          )}
                        </div>
                        <div style={{
                          padding: "14px 18px",
                          borderRadius: "0 var(--radius-lg) var(--radius-lg) var(--radius-lg)",
                          background: "hsl(var(--bg-elevated))",
                          border: "1px solid hsl(var(--border-subtle))",
                          fontSize: "0.9rem", lineHeight: 1.6, color: "hsl(var(--text-primary))",
                        }}>
                          {msg.content}
                        </div>
                        {msg.follow_up_hint && (
                          <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 8, paddingLeft: 4 }}>
                            <Lightbulb size={12} style={{ color: "hsl(var(--color-warning))", flexShrink: 0, marginTop: 1 }} />
                            <span style={{ fontSize: "0.73rem", color: "hsl(var(--text-muted))", fontStyle: "italic" }}>
                              Tip: {msg.follow_up_hint}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {msg.type === "answer" && (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "flex-end" }}>
                      <div style={{
                        maxWidth: "75%",
                        padding: "14px 18px",
                        borderRadius: "var(--radius-lg) 0 var(--radius-lg) var(--radius-lg)",
                        background: "hsl(var(--color-primary) / 0.15)",
                        border: "1px solid hsl(var(--color-primary) / 0.3)",
                        fontSize: "0.875rem", lineHeight: 1.6, color: "hsl(var(--text-primary))",
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "hsl(var(--color-primary) / 0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, fontSize: "0.8rem", fontWeight: 700, color: "hsl(var(--color-primary-light))" }}>
                        You
                      </div>
                    </div>
                  )}

                  {msg.type === "feedback" && msg.scores && (
                    <div className="animate-fade-in" style={{
                      margin: "16px 0",
                      padding: "16px 20px",
                      borderRadius: "var(--radius-lg)",
                      background: "hsl(var(--bg-overlay))",
                      border: "1px solid hsl(var(--border-subtle))",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <Target size={15} style={{ color: "hsl(var(--color-accent))" }} />
                        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "hsl(var(--color-accent))" }}>
                          Answer scored: {msg.scores.composite_score.toFixed(1)}/10
                        </span>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))", lineHeight: 1.6 }}>
                        {msg.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {submittingAnswer && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Brain size={14} color="white" />
                  </div>
                  <div style={{ padding: "12px 16px", borderRadius: "0 var(--radius-lg) var(--radius-lg) var(--radius-lg)", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(var(--color-primary))", animation: "bounce 0.8s infinite" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(var(--color-primary))", animation: "bounce 0.8s 0.15s infinite" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(var(--color-primary))", animation: "bounce 0.8s 0.3s infinite" }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Detailed feedback panel (after each answer) */}
            {currentScores && showFeedback && phase === "interview" && (
              <div className="animate-fade-in" style={{ borderTop: "1px solid hsl(var(--border-subtle))", padding: "20px 24px", background: "hsl(var(--bg-elevated))" }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  {[
                    { label: "Clarity", val: currentScores.score_clarity },
                    { label: "Relevance", val: currentScores.score_relevance },
                    { label: "Structure", val: currentScores.score_structure },
                    { label: "Accuracy", val: currentScores.score_accuracy },
                    { label: "Comm.", val: currentScores.score_communication },
                    { label: "Overall", val: currentScores.composite_score },
                  ].map((s) => <ScoreRing key={s.label} score={s.val} size={70} label={s.label} />)}
                </div>

                {currentScores.sample_answer && (
                  <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "hsl(var(--color-info) / 0.08)", border: "1px solid hsl(var(--color-info) / 0.25)", marginBottom: 14 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "hsl(var(--color-info))", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Sample Strong Answer
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))", lineHeight: 1.6 }}>
                      {currentScores.sample_answer}
                    </p>
                  </div>
                )}

                <button onClick={handleContinue} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  {qaHistory.length >= totalQuestions ? "View Final Results" : "Next Question"}
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            {/* Text input */}
            {!showFeedback && phase === "interview" && (
              <div style={{ borderTop: "1px solid hsl(var(--border-subtle))", padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-end" }}>
                <textarea
                  ref={textareaRef}
                  placeholder="Type your answer here... (be detailed and specific)"
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmitAnswer();
                  }}
                  style={{
                    flex: 1, minHeight: 80, maxHeight: 200, resize: "vertical",
                    padding: "12px 14px", borderRadius: "var(--radius-md)",
                    border: "1px solid hsl(var(--border-default))",
                    background: "hsl(var(--bg-base))", color: "hsl(var(--text-primary))",
                    fontSize: "0.875rem", lineHeight: 1.6, fontFamily: "var(--font-sans)",
                    outline: "none",
                  }}
                />
                <button
                  id="btn-submit-interview-answer"
                  onClick={handleSubmitAnswer}
                  disabled={!answerDraft.trim() || submittingAnswer}
                  className="btn btn-primary"
                  style={{ flexShrink: 0, alignSelf: "flex-end" }}
                >
                  {submittingAnswer ? <Loader2 size={18} className="animate-spin-slow" /> : <Send size={18} />}
                </button>
              </div>
            )}

            {/* Reviewing state (complete, awaiting summary) */}
            {phase === "reviewing" && !showFeedback && (
              <div style={{ borderTop: "1px solid hsl(var(--border-subtle))", padding: "20px 24px", textAlign: "center" }}>
                <p style={{ color: "hsl(var(--text-secondary))", marginBottom: 16, fontSize: "0.9rem" }}>
                  You've completed all {totalQuestions} questions! Ready to see your full performance report?
                </p>
                <button onClick={handleComplete} className="btn btn-primary btn-lg" disabled={loadingSummary} style={{ margin: "0 auto" }}>
                  {loadingSummary ? <Loader2 size={18} className="animate-spin-slow" /> : <Trophy size={18} />}
                  {loadingSummary ? "Generating Report..." : "See Full Results"}
                </button>
              </div>
            )}
          </div>

          {phase === "interview" && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setPhase("reviewing"); }} className="btn btn-ghost btn-sm" style={{ color: "hsl(var(--text-muted))" }}>
                End Interview Early
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RESULTS
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "results" && summary && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Score hero */}
          <div className="card" style={{
            padding: "48px 40px",
            background: "linear-gradient(135deg, hsl(220 90% 56% / 0.08), hsl(258 90% 66% / 0.06))",
            border: "1px solid hsl(var(--color-primary) / 0.25)",
            textAlign: "center",
          }}>
            <div style={{ marginBottom: 24 }}>
              <ScoreRing score={summary.overall_score} size={120} label="Overall Score" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {summary.overall_score >= 8 ? "Outstanding performance! 🎉" : summary.overall_score >= 6 ? "Strong interview — well done! ✅" : "Good effort — keep practicing! 💪"}
            </h2>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
              {summary.summary}
            </p>
          </div>

          {/* Strengths & Weaknesses */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "hsl(var(--color-success))" }}>
                <ThumbsUp size={18} />
                Strengths
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {summary.strengths.map((s) => (
                  <div key={s} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 12px", borderRadius: "var(--radius-md)", background: "hsl(var(--color-success) / 0.06)", border: "1px solid hsl(var(--color-success) / 0.2)" }}>
                    <CheckCircle size={14} style={{ color: "hsl(var(--color-success))", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: "0.85rem", color: "hsl(var(--text-secondary))", lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "hsl(var(--color-warning))" }}>
                <ThumbsDown size={18} />
                Areas to Improve
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {summary.weaknesses.map((w) => (
                  <div key={w} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 12px", borderRadius: "var(--radius-md)", background: "hsl(var(--color-warning) / 0.06)", border: "1px solid hsl(var(--color-warning) / 0.2)" }}>
                    <TrendingUp size={14} style={{ color: "hsl(var(--color-warning))", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: "0.85rem", color: "hsl(var(--text-secondary))", lineHeight: 1.4 }}>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={handleReset} className="btn btn-primary btn-lg">
              <RotateCcw size={18} />
              Practice Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
