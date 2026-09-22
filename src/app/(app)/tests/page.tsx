"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Brain,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Timer,
  Trophy,
  Loader2,
  Sparkles,
  Target,
  Zap,
  RotateCcw,
  AlertCircle,
  BookOpen,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface GeneratedQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic_tags: string[];
  difficulty: "easy" | "medium" | "hard";
}

type TestPhase = "setup" | "generating" | "quiz" | "results";

const JOB_ROLES = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Scientist",
  "DevOps Engineer",
  "Machine Learning Engineer",
  "Mobile Engineer (React Native)",
  "Product Manager",
  "UI/UX Designer",
  "Senior Backend Engineer",
];

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "hsl(var(--color-success))", bg: "hsl(var(--color-success) / 0.12)", desc: "Core concepts & fundamentals" },
  medium: { label: "Medium", color: "hsl(var(--color-warning))", bg: "hsl(var(--color-warning) / 0.12)", desc: "Applied skills & real scenarios" },
  hard: { label: "Hard", color: "hsl(var(--color-danger))", bg: "hsl(var(--color-danger) / 0.12)", desc: "Advanced & system-level thinking" },
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SkillTestsPage() {
  const [phase, setPhase] = useState<TestPhase>("setup");

  // Setup state
  const [selectedRole, setSelectedRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionCount, setQuestionCount] = useState(10);
  const [errorMsg, setErrorMsg] = useState("");

  // Quiz state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Array<{ is_correct: boolean; selected: string; correct: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimitMins, setTimeLimitMins] = useState(20);
  const [timerActive, setTimerActive] = useState(false);

  // Results
  const [score, setScore] = useState(0);

  // ── Timer countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          // Auto-finish when time runs out
          handleFinishSession();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Generate test ────────────────────────────────────────────────────────
  async function handleGenerate() {
    const role = customRole.trim() || selectedRole;
    if (!role) { setErrorMsg("Please select or enter a job role."); return; }
    setErrorMsg("");
    setPhase("generating");

    try {
      const res = await fetch("/api/tests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, difficulty, count: questionCount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to generate test. Please try again.");
        setPhase("setup");
        return;
      }

      setSessionId(data.session_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setTimeLimitMins(data.time_limit_mins);
      setTimeLeft(data.time_limit_mins * 60);
      setTimerActive(true);
      setPhase("quiz");
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setPhase("setup");
    }
  }

  // ── Submit answer ────────────────────────────────────────────────────────
  const handleSubmitAnswer = useCallback(async () => {
    if (!selectedAnswer || isAnswered || submitting) return;
    setSubmitting(true);

    const q = questions[currentIdx];
    const isLast = currentIdx === questions.length - 1;
    const correct = selectedAnswer === q.correct_answer;
    setIsCorrect(correct);
    setIsAnswered(true);

    try {
      const res = await fetch(`/api/tests/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: q.id,
          user_answer: selectedAnswer,
          correct_answer: q.correct_answer,
          time_taken_secs: 0,
          difficulty: q.difficulty,
          is_last: isLast,
          answers_so_far: answers.map((a) => ({ is_correct: a.is_correct })),
        }),
      });
      const data = await res.json();

      const newAnswers = [...answers, { is_correct: correct, selected: selectedAnswer, correct: q.correct_answer }];
      setAnswers(newAnswers);

      if (isLast) {
        setTimerActive(false);
        setScore(data.overall_score ?? Math.round((newAnswers.filter((a) => a.is_correct).length / newAnswers.length) * 100));
      }
    } catch {
      console.error("Answer submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [selectedAnswer, isAnswered, submitting, currentIdx, questions, sessionId, answers]);

  // ── Next question ────────────────────────────────────────────────────────
  function handleNext() {
    if (currentIdx === questions.length - 1) {
      setPhase("results");
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(null);
    }
  }

  // ── Finish early ─────────────────────────────────────────────────────────
  async function handleFinishSession() {
    if (answers.length === 0) { setPhase("setup"); return; }
    const finalScore = Math.round((answers.filter((a) => a.is_correct).length / questions.length) * 100);
    setScore(finalScore);
    setTimerActive(false);
    setPhase("results");
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  function handleReset() {
    setPhase("setup");
    setSessionId(null);
    setQuestions([]);
    setCurrentIdx(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setTimerActive(false);
    setErrorMsg("");
  }

  const currentQuestion = questions[currentIdx];
  const progressPct = questions.length > 0 ? ((currentIdx + (isAnswered ? 1 : 0)) / questions.length) * 100 : 0;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, hsl(142 72% 50%), hsl(196 80% 54%))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ClipboardList size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
              Skill Assessment Engine
            </h1>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.9rem" }}>
              AI-generated adaptive quizzes — MCQ, scenario-based, best-practice
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SETUP PHASE
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "setup" && (
        <div className="animate-fade-in">
          <div className="card" style={{ padding: 40 }}>
            {/* Role Selection */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 14, fontSize: "0.95rem" }}>
                Target Role <span style={{ color: "hsl(var(--text-muted))", fontWeight: 400, fontSize: "0.85rem" }}>— what are you preparing for?</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
                {JOB_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => { setSelectedRole(role); setCustomRole(""); }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: `2px solid ${selectedRole === role && !customRole ? "hsl(var(--color-primary))" : "hsl(var(--border-subtle))"}`,
                      background: selectedRole === role && !customRole ? "hsl(var(--color-primary) / 0.12)" : "hsl(var(--bg-elevated))",
                      color: selectedRole === role && !customRole ? "hsl(var(--color-primary-light))" : "hsl(var(--text-secondary))",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      fontWeight: selectedRole === role && !customRole ? 700 : 500,
                      textAlign: "left",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <div>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", marginBottom: 8 }}>Or type a custom role:</p>
                <input
                  className="input"
                  placeholder="e.g., Blockchain Developer, QA Engineer..."
                  value={customRole}
                  onChange={(e) => { setCustomRole(e.target.value); setSelectedRole(""); }}
                  style={{ maxWidth: 400 }}
                />
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 14, fontSize: "0.95rem" }}>
                Difficulty Level
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(Object.entries(DIFFICULTY_CONFIG) as [typeof difficulty, typeof DIFFICULTY_CONFIG.easy][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    style={{
                      padding: "14px 20px",
                      borderRadius: "var(--radius-md)",
                      border: `2px solid ${difficulty === key ? cfg.color : "hsl(var(--border-subtle))"}`,
                      background: difficulty === key ? cfg.bg : "hsl(var(--bg-elevated))",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all var(--transition-fast)",
                      minWidth: 160,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: difficulty === key ? cfg.color : "hsl(var(--text-secondary))", marginBottom: 4 }}>
                      {cfg.label}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>{cfg.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div style={{ marginBottom: 36 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 14, fontSize: "0.95rem" }}>
                Number of Questions: <span style={{ color: "hsl(var(--color-primary-light))", fontFamily: "var(--font-mono)" }}>{questionCount}</span>
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    style={{
                      width: 56, height: 44,
                      borderRadius: "var(--radius-md)",
                      border: `2px solid ${questionCount === n ? "hsl(var(--color-primary))" : "hsl(var(--border-subtle))"}`,
                      background: questionCount === n ? "hsl(var(--color-primary) / 0.12)" : "hsl(var(--bg-elevated))",
                      color: questionCount === n ? "hsl(var(--color-primary-light))" : "hsl(var(--text-secondary))",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: 8, fontSize: "0.78rem", color: "hsl(var(--text-muted))" }}>
                Estimated time: ~{questionCount * 2} minutes
              </p>
            </div>

            {errorMsg && (
              <div style={{
                marginBottom: 24, padding: "12px 16px", borderRadius: "var(--radius-md)",
                background: "hsl(var(--color-danger) / 0.1)",
                border: "1px solid hsl(var(--color-danger) / 0.3)",
                color: "hsl(var(--color-danger))", fontSize: "0.875rem",
                display: "flex", gap: 10, alignItems: "center",
              }}>
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                id="btn-start-test"
                className="btn btn-primary btn-lg"
                onClick={handleGenerate}
              >
                <Sparkles size={20} />
                Generate My Test
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
            {[
              { icon: Brain, label: "AI-Generated", desc: "Unique questions every session", color: "hsl(var(--color-primary))" },
              { icon: Target, label: "Role-Specific", desc: "Tailored to your target job", color: "hsl(var(--color-accent))" },
              { icon: Zap, label: "Instant Scoring", desc: "Get results immediately", color: "hsl(var(--color-success))" },
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
          GENERATING PHASE
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "generating" && (
        <div className="card animate-fade-in" style={{ padding: 80, textAlign: "center" }}>
          <Loader2 size={56} className="animate-spin-slow" style={{ color: "hsl(var(--color-primary))", margin: "0 auto 24px" }} />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, marginBottom: 12 }}>
            Crafting your personalized test...
          </h3>
          <p style={{ color: "hsl(var(--text-secondary))", maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Our AI is generating {questionCount} {difficulty} questions tailored specifically for your target role. This takes ~10–15 seconds.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
            {["Analyzing role requirements", "Generating unique questions", "Preparing explanations", "Finalizing your test"].map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.85rem", color: "hsl(var(--text-secondary))" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "hsl(var(--color-primary) / 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Loader2 size={11} style={{ color: "hsl(var(--color-primary))", animation: `spin 1s linear ${i * 0.25}s infinite` }} />
                </div>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          QUIZ PHASE
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "quiz" && currentQuestion && (
        <div className="animate-fade-in">
          {/* Progress bar + timer */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 99, background: "hsl(var(--bg-elevated))", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: "var(--gradient-brand)",
                width: `${progressPct}%`,
                transition: "width var(--transition-base)",
              }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "hsl(var(--text-muted))", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{currentIdx + 1}</span>
              <span>/</span>
              <span>{questions.length}</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 99,
              background: timeLeft < 60 ? "hsl(var(--color-danger) / 0.15)" : "hsl(var(--bg-elevated))",
              border: `1px solid ${timeLeft < 60 ? "hsl(var(--color-danger) / 0.4)" : "hsl(var(--border-subtle))"}`,
              color: timeLeft < 60 ? "hsl(var(--color-danger))" : "hsl(var(--text-secondary))",
              fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0,
            }}>
              <Timer size={14} />
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Question card */}
          <div className="card" style={{ padding: 40, marginBottom: 20 }}>
            {/* Difficulty + tags */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <span className="badge" style={{
                background: DIFFICULTY_CONFIG[currentQuestion.difficulty].bg,
                color: DIFFICULTY_CONFIG[currentQuestion.difficulty].color,
                fontSize: "0.72rem",
              }}>
                {DIFFICULTY_CONFIG[currentQuestion.difficulty].label}
              </span>
              {currentQuestion.topic_tags.slice(0, 3).map((tag) => (
                <span key={tag} className="badge badge-muted" style={{ fontSize: "0.72rem" }}>{tag}</span>
              ))}
            </div>

            {/* Question text */}
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 700,
              lineHeight: 1.5, marginBottom: 28, letterSpacing: "-0.01em",
            }}>
              {currentQuestion.question_text}
            </h2>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {currentQuestion.options.map((option, i) => {
                const isSelected = selectedAnswer === option;
                const showCorrect = isAnswered && option === currentQuestion.correct_answer;
                const showWrong = isAnswered && isSelected && !isCorrect;

                let borderColor = "hsl(var(--border-subtle))";
                let bg = "hsl(var(--bg-elevated))";
                let textColor = "hsl(var(--text-secondary))";

                if (isAnswered) {
                  if (showCorrect) {
                    borderColor = "hsl(var(--color-success))";
                    bg = "hsl(var(--color-success) / 0.1)";
                    textColor = "hsl(var(--color-success))";
                  } else if (showWrong) {
                    borderColor = "hsl(var(--color-danger))";
                    bg = "hsl(var(--color-danger) / 0.1)";
                    textColor = "hsl(var(--color-danger))";
                  }
                } else if (isSelected) {
                  borderColor = "hsl(var(--color-primary))";
                  bg = "hsl(var(--color-primary) / 0.12)";
                  textColor = "hsl(var(--color-primary-light))";
                }

                return (
                  <button
                    key={option}
                    onClick={() => !isAnswered && setSelectedAnswer(option)}
                    disabled={isAnswered}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 18px",
                      borderRadius: "var(--radius-md)",
                      border: `2px solid ${borderColor}`,
                      background: bg,
                      cursor: isAnswered ? "default" : "pointer",
                      textAlign: "left",
                      transition: "all var(--transition-fast)",
                      width: "100%",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: isAnswered ? (showCorrect || showWrong ? bg : "hsl(var(--bg-overlay))") : isSelected ? "hsl(var(--color-primary) / 0.2)" : "hsl(var(--bg-overlay))",
                      border: `2px solid ${borderColor}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isAnswered && showCorrect && <CheckCircle size={14} style={{ color: "hsl(var(--color-success))" }} />}
                      {isAnswered && showWrong && <XCircle size={14} style={{ color: "hsl(var(--color-danger))" }} />}
                      {!isAnswered && (
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "hsl(var(--color-primary-light))" : "hsl(var(--text-muted))" }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.9rem", fontWeight: isSelected || showCorrect ? 600 : 400, color: textColor, flex: 1 }}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation (shown after answering) */}
            {isAnswered && (
              <div className="animate-fade-in" style={{
                marginTop: 24, padding: "16px 20px",
                borderRadius: "var(--radius-md)",
                background: isCorrect ? "hsl(var(--color-success) / 0.08)" : "hsl(var(--color-danger) / 0.08)",
                border: `1px solid ${isCorrect ? "hsl(var(--color-success) / 0.3)" : "hsl(var(--color-danger) / 0.3)"}`,
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <BookOpen size={16} style={{ color: isCorrect ? "hsl(var(--color-success))" : "hsl(var(--color-danger))", flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: 6, color: isCorrect ? "hsl(var(--color-success))" : "hsl(var(--color-danger))" }}>
                      {isCorrect ? "✓ Correct!" : "✗ Not quite — here's why:"}
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-secondary))", lineHeight: 1.6 }}>
                      {currentQuestion.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={handleFinishSession}
              className="btn btn-ghost btn-sm"
              style={{ color: "hsl(var(--text-muted))" }}
            >
              Finish Early
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              {!isAnswered ? (
                <button
                  id="btn-submit-answer"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer || submitting}
                  className="btn btn-primary"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin-slow" /> : null}
                  Submit Answer
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  id="btn-next-question"
                  onClick={handleNext}
                  className="btn btn-primary"
                >
                  {currentIdx === questions.length - 1 ? "See Results" : "Next Question"}
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RESULTS PHASE
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "results" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Score hero */}
          <div className="card" style={{
            padding: 48,
            background: score >= 80
              ? "linear-gradient(135deg, hsl(142 72% 50% / 0.08), hsl(196 80% 54% / 0.06))"
              : score >= 60
              ? "linear-gradient(135deg, hsl(38 95% 64% / 0.08), hsl(258 90% 66% / 0.06))"
              : "linear-gradient(135deg, hsl(0 84% 60% / 0.08), hsl(38 95% 64% / 0.06))",
            border: `1px solid ${score >= 80 ? "hsl(var(--color-success) / 0.3)" : score >= 60 ? "hsl(var(--color-warning) / 0.3)" : "hsl(var(--color-danger) / 0.3)"}`,
            textAlign: "center",
          }}>
            <Trophy size={48} style={{ color: score >= 80 ? "hsl(var(--color-success))" : score >= 60 ? "hsl(var(--color-warning))" : "hsl(var(--color-danger))", margin: "0 auto 20px" }} />
            <div style={{
              fontFamily: "var(--font-display)", fontSize: "4rem", fontWeight: 900,
              letterSpacing: "-0.04em", lineHeight: 1,
              color: score >= 80 ? "hsl(var(--color-success))" : score >= 60 ? "hsl(var(--color-warning))" : "hsl(var(--color-danger))",
              marginBottom: 8,
            }}>
              {score}%
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {score >= 80 ? "Excellent performance! 🎉" : score >= 60 ? "Good effort — room to grow! ✅" : "Keep practicing — you've got this! 💪"}
            </h2>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "1rem", lineHeight: 1.6 }}>
              {answers.filter((a) => a.is_correct).length} out of {answers.length} questions correct
            </p>
          </div>

          {/* Per-question breakdown */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: 20 }}>
              Question Breakdown
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {questions.slice(0, answers.length).map((q, i) => {
                const ans = answers[i];
                if (!ans) return null;
                return (
                  <div key={q.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "12px 16px", borderRadius: "var(--radius-md)",
                    background: ans.is_correct ? "hsl(var(--color-success) / 0.06)" : "hsl(var(--color-danger) / 0.06)",
                    border: `1px solid ${ans.is_correct ? "hsl(var(--color-success) / 0.2)" : "hsl(var(--color-danger) / 0.2)"}`,
                  }}>
                    {ans.is_correct
                      ? <CheckCircle size={16} style={{ color: "hsl(var(--color-success))", flexShrink: 0, marginTop: 2 }} />
                      : <XCircle size={16} style={{ color: "hsl(var(--color-danger))", flexShrink: 0, marginTop: 2 }} />
                    }
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-primary))", fontWeight: 500, marginBottom: 4, lineHeight: 1.4 }}>
                        Q{i + 1}: {q.question_text.length > 100 ? q.question_text.slice(0, 100) + "..." : q.question_text}
                      </p>
                      {!ans.is_correct && (
                        <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))" }}>
                          Correct: <span style={{ color: "hsl(var(--color-success))", fontWeight: 600 }}>{q.correct_answer}</span>
                        </p>
                      )}
                    </div>
                    <span className="badge" style={{
                      background: DIFFICULTY_CONFIG[q.difficulty].bg,
                      color: DIFFICULTY_CONFIG[q.difficulty].color,
                      fontSize: "0.68rem", flexShrink: 0,
                    }}>
                      {DIFFICULTY_CONFIG[q.difficulty].label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={handleReset} className="btn btn-primary btn-lg">
              <RotateCcw size={18} />
              Take Another Test
            </button>
            <button
              onClick={() => { setPhase("setup"); }}
              className="btn btn-secondary"
            >
              <ChevronLeft size={18} />
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
