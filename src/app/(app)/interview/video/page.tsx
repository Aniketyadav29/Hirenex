"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  Brain,
  Mic,
  MicOff,
  ChevronRight,
  Loader2,
  RotateCcw,
  Send,
  CheckCircle,
  Target,
  TrendingUp,
  Trophy,
  Sparkles,
  AlertCircle,
  FileText,
  Play,
  MessageCircle,
  Star,
  Eye,
  ArrowLeft,
} from "lucide-react";
import VideoRecorder, { type VideoRecorderHandle } from "@/components/interview/VideoRecorder";
import PresenceMonitor from "@/components/interview/PresenceMonitor";

// ─── Types ─────────────────────────────────────────────────────────────────────
type VideoPhase = "setup" | "camera-check" | "countdown" | "interview" | "uploading" | "scoring" | "feedback" | "complete" | "results";

interface Question {
  question_text: string;
  question_type: "technical" | "behavioral" | "situational";
  follow_up_hint?: string;
}

interface VideoScoreResult {
  score_clarity: number;
  score_relevance: number;
  score_structure: number;
  score_confidence: number;
  score_accuracy: number;
  score_communication: number;
  composite_score: number;
  score_presence: number;
  video_composite_score: number;
  feedback: string;
  sample_answer: string;
}

interface AnswerRecord {
  turn: number;
  question: Question;
  transcript: string;
  videoUrl: string | null;
  scores: VideoScoreResult;
  presenceScore: number;
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
  { value: "behavioral", label: "Behavioral", icon: "🤝", desc: "STAR stories, team dynamics" },
  { value: "mixed", label: "Mixed", icon: "🎯", desc: "Technical + behavioral" },
] as const;

// ─── Score Ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, label, max = 10 }: { score: number; size?: number; label: string; max?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const color = score / max >= 0.8 ? "hsl(var(--color-success))" : score / max >= 0.5 ? "hsl(var(--color-warning))" : "hsl(var(--color-danger))";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--bg-overlay))" strokeWidth={7} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${(score / max) * circ} ${circ}`}
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

// ─── Countdown Overlay ──────────────────────────────────────────────────────────
function CountdownOverlay({ count }: { count: number }) {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", zIndex: 10,
      background: "hsl(222 47% 7% / 0.75)", backdropFilter: "blur(4px)",
      borderRadius: "var(--radius-lg)",
    }}>
      <div style={{
        fontSize: "7rem", fontWeight: 900, fontFamily: "var(--font-display)",
        color: "white", lineHeight: 1,
        textShadow: "0 0 60px hsl(220 90% 56% / 0.8)",
        animation: "fadeIn 0.3s ease",
      }}>
        {count}
      </div>
      <p style={{ color: "hsl(var(--text-secondary))", marginTop: 16, fontSize: "1rem" }}>
        Get ready to answer…
      </p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VideoInterviewPage() {
  const [phase, setPhase] = useState<VideoPhase>("setup");

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
  const [prevQuestions, setPrevQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  // Camera & recording
  const videoRecorderRef = useRef<VideoRecorderHandle>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [presenceScore, setPresenceScore] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Countdown
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results
  const [currentScores, setCurrentScores] = useState<VideoScoreResult | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const role = customRole.trim() || selectedRole;

  // Capture stream for PresenceMonitor
  const handleStreamReady = useCallback((stream: MediaStream) => {
    setCameraStream(stream);
  }, []);

  // Start speech recognition
  const startTranscription = useCallback(() => {
    // Web Speech API — available in Chrome/Edge; graceful no-op on others
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Win = window as any;
    const SpeechRecognitionAPI = Win.SpeechRecognition || Win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, []);

  const stopTranscription = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  // ── Start interview session ──────────────────────────────────────────────────
  async function handleStart() {
    if (!role) { setErrorMsg("Please select or enter a role."); return; }
    setErrorMsg("");
    setPhase("camera-check");
  }

  async function handleCameraReady() {
    setPhase("countdown");
    let count = 3;
    setCountdown(3);

    countdownRef.current = setInterval(async () => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countdownRef.current!);
        await startInterview();
      }
    }, 1000);
  }

  async function startInterview() {
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
      setPrevQuestions([data.question.question_text]);
      setTranscript("");

      setPhase("interview");

      // Begin recording & transcription
      setTimeout(() => {
        videoRecorderRef.current?.startRecording();
        startTranscription();
      }, 500);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPhase("setup");
    }
  }

  // ── Submit answer ────────────────────────────────────────────────────────────
  async function handleSubmitAnswer() {
    if (!sessionId || !currentQuestion) return;

    stopTranscription();
    setPhase("uploading");

    // Stop recording & get blob
    const blob = await videoRecorderRef.current?.stopRecording();
    let videoUrl: string | null = null;

    if (blob && blob.size > 0) {
      try {
        const formData = new FormData();
        formData.append("video", blob, `turn-${currentTurn}.webm`);
        formData.append("session_id", sessionId);
        formData.append("turn_index", String(currentTurn));

        const uploadRes = await fetch("/api/interview/video-upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) videoUrl = uploadData.video_url;
      } catch {
        // Upload failed — proceed without video URL
      }
    }

    setCurrentVideoUrl(videoUrl);
    setPhase("scoring");

    try {
      const res = await fetch(`/api/interview/${sessionId}/video-respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turn: currentTurn,
          question_text: currentQuestion.question_text,
          question_type: currentQuestion.question_type,
          answer_text: transcript || "(No speech detected)",
          presence_score: presenceScore,
          video_url: videoUrl,
          role,
          interview_type: interviewType,
          total_questions: totalQuestions,
          prev_questions: prevQuestions,
          job_description: jobDescription || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Video respond error:", data.error);
        setPhase("interview");
        return;
      }

      const record: AnswerRecord = {
        turn: currentTurn,
        question: currentQuestion,
        transcript: transcript || "(No speech detected)",
        videoUrl,
        scores: data.scores,
        presenceScore,
      };
      setAnswers((prev) => [...prev, record]);
      setCurrentScores(data.scores);
      setPhase("feedback");

      if (!data.is_complete) {
        setCurrentQuestion(data.next_question);
        setPrevQuestions((prev) => [...prev, data.next_question.question_text]);
      }
    } catch {
      console.error("Submit failed");
      setPhase("interview");
    }
  }

  // ── Continue to next question ────────────────────────────────────────────────
  function handleContinue() {
    if (!currentQuestion) return;
    setCurrentTurn((t) => t + 1);
    setTranscript("");
    setCurrentScores(null);
    setCurrentVideoUrl(null);
    setPhase("countdown");

    let count = 3;
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countdownRef.current!);
        setPhase("interview");
        videoRecorderRef.current?.resetRecording();
        setTimeout(() => {
          videoRecorderRef.current?.startRecording();
          startTranscription();
        }, 300);
      }
    }, 1000);
  }

  // ── Complete session ─────────────────────────────────────────────────────────
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

  // ── Reset ────────────────────────────────────────────────────────────────────
  function handleReset() {
    setPhase("setup");
    setSessionId(null);
    setCurrentTurn(1);
    setCurrentQuestion(null);
    setAnswers([]);
    setTranscript("");
    setCurrentScores(null);
    setCurrentVideoUrl(null);
    setSummary(null);
    setErrorMsg("");
    setPrevQuestions([]);
    recognitionRef.current?.stop();
  }

  const isLastQuestion = currentTurn >= totalQuestions;

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Video size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
              Video Interview Mode
            </h1>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.9rem" }}>
              Record your answers on webcam — AI scores content AND eye contact
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        {(phase === "setup" || phase === "camera-check") && (
          <div style={{ display: "flex", background: "hsl(var(--bg-elevated))", borderRadius: "var(--radius-lg)", padding: 4, border: "1px solid hsl(var(--border-subtle))" }}>
            <Link
              href="/interview"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: "var(--radius-md)", textDecoration: "none", background: "transparent", color: "hsl(var(--text-secondary))", fontWeight: 600, fontSize: "0.85rem" }}
            >
              <MessageCircle size={15} /> Text Mode
            </Link>
            <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: "var(--radius-md)", border: "none", cursor: "default", background: "hsl(258 90% 66% / 0.15)", color: "hsl(258 90% 80%)", fontWeight: 700, fontSize: "0.85rem" }}>
              <Video size={15} /> Video Mode
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SETUP
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "setup" && (
        <div className="animate-fade-in">
          {/* Info banner */}
          <div style={{ display: "flex", gap: 12, padding: "14px 20px", borderRadius: "var(--radius-md)", background: "hsl(258 90% 66% / 0.08)", border: "1px solid hsl(258 90% 66% / 0.2)", marginBottom: 28 }}>
            <Video size={18} style={{ color: "hsl(258 90% 70%)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: "0.875rem", color: "hsl(var(--text-secondary))" }}>
              <strong style={{ color: "hsl(258 90% 70%)" }}>Video mode active.</strong> Your answers will be recorded via webcam. Speech-to-text transcription is used for AI scoring. Your eye contact is also tracked and scored.
            </div>
          </div>

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
                      border: `2px solid ${selectedRole === r && !customRole ? "hsl(258 90% 66%)" : "hsl(var(--border-subtle))"}`,
                      background: selectedRole === r && !customRole ? "hsl(258 90% 66% / 0.12)" : "hsl(var(--bg-elevated))",
                      color: selectedRole === r && !customRole ? "hsl(258 90% 80%)" : "hsl(var(--text-secondary))",
                      cursor: "pointer", fontSize: "0.8rem", fontWeight: selectedRole === r && !customRole ? 700 : 500,
                      textAlign: "left", transition: "all var(--transition-fast)",
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
                      border: `2px solid ${interviewType === type.value ? "hsl(258 90% 66%)" : "hsl(var(--border-subtle))"}`,
                      background: interviewType === type.value ? "hsl(258 90% 66% / 0.12)" : "hsl(var(--bg-elevated))",
                      cursor: "pointer", transition: "all var(--transition-fast)", minWidth: 160,
                    }}>
                    <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>{type.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: interviewType === type.value ? "hsl(258 90% 80%)" : "hsl(var(--text-secondary))", marginBottom: 4 }}>
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
                Number of Questions: <span style={{ color: "hsl(258 90% 70%)", fontFamily: "var(--font-mono)" }}>{totalQuestions}</span>
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {[3, 5, 7, 10].map((n) => (
                  <button key={n} onClick={() => setTotalQuestions(n)}
                    style={{
                      width: 52, height: 40, borderRadius: "var(--radius-md)",
                      border: `2px solid ${totalQuestions === n ? "hsl(258 90% 66%)" : "hsl(var(--border-subtle))"}`,
                      background: totalQuestions === n ? "hsl(258 90% 66% / 0.12)" : "hsl(var(--bg-elevated))",
                      color: totalQuestions === n ? "hsl(258 90% 80%)" : "hsl(var(--text-secondary))",
                      fontWeight: 700, cursor: "pointer", transition: "all var(--transition-fast)",
                    }}>{n}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional JD */}
            <div style={{ marginBottom: 36 }}>
              <button onClick={() => setShowJD(!showJD)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(258 90% 70%)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: showJD ? 12 : 0 }}>
                <FileText size={14} />
                {showJD ? "Hide" : "Paste job description (optional)"}
                <ChevronRight size={14} style={{ transform: showJD ? "rotate(90deg)" : "none", transition: "transform var(--transition-fast)" }} />
              </button>
              {showJD && (
                <textarea className="input" rows={4} placeholder="Paste the job description here to tailor questions..."
                  value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                  style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }} />
              )}
            </div>

            {errorMsg && (
              <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "hsl(var(--color-danger) / 0.1)", border: "1px solid hsl(var(--color-danger) / 0.3)", color: "hsl(var(--color-danger))", fontSize: "0.85rem", marginBottom: 20 }}>
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            <button onClick={handleStart} className="btn btn-primary"
              style={{ background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))", fontSize: "1rem", padding: "14px 36px" }}>
              <Video size={18} /> Set Up Camera →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CAMERA CHECK
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "camera-check" && (
        <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
          {/* Camera preview */}
          <div className="card" style={{ padding: 28 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 20 }}>
              📷 Camera &amp; Microphone Check
            </h2>

            <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <VideoRecorder
                ref={videoRecorderRef}
                onStreamReady={handleStreamReady}
                width={undefined as unknown as number}
                height={400}
                autoStart
              />
              {cameraStream && (
                <div style={{ position: "absolute", bottom: 12, left: 12 }}>
                  <PresenceMonitor stream={cameraStream} onScoreChange={setPresenceScore} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "hsl(var(--bg-elevated))" }}>
                <CheckCircle size={16} style={{ color: "hsl(var(--color-success))" }} />
                <span style={{ fontSize: "0.875rem" }}>Camera access granted</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "hsl(var(--bg-elevated))" }}>
                <Mic size={16} style={{ color: "hsl(var(--color-success))" }} />
                <span style={{ fontSize: "0.875rem" }}>Microphone access granted</span>
              </div>
            </div>
          </div>

          {/* Tips & start */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={16} style={{ color: "hsl(258 90% 70%)" }} /> Video Interview Tips
              </h3>
              {[
                "Look directly at your camera lens, not the screen",
                "Ensure your face is well-lit from the front",
                "Speak clearly and at a moderate pace",
                "Keep a neutral background if possible",
                "Sit straight — good posture conveys confidence",
              ].map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: "0.82rem", color: "hsl(var(--text-secondary))" }}>
                  <span style={{ color: "hsl(258 90% 70%)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  {tip}
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 12 }}>
                🎯 How Scoring Works
              </h3>
              <div style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))", lineHeight: 1.7, marginBottom: 16 }}>
                Your answers are scored on:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[["Content", "85%"], ["Eye Contact", "15%"]].map(([label, pct]) => (
                  <div key={label} style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "hsl(var(--bg-elevated))", textAlign: "center" }}>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "hsl(258 90% 70%)" }}>{pct}</div>
                    <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-muted))" }}>{label}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleCameraReady} className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))" }}>
                <Play size={18} /> Start Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INTERVIEW (countdown overlay + interview)
         ══════════════════════════════════════════════════════════════════════ */}
      {(phase === "countdown" || phase === "interview" || phase === "uploading" || phase === "scoring" || phase === "feedback") && (
        <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
          {/* Left: Camera column */}
          <div style={{ position: "sticky", top: 88, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Camera feed */}
            <div style={{ position: "relative" }}>
              <VideoRecorder
                ref={videoRecorderRef}
                onStreamReady={handleStreamReady}
                width={360}
                height={270}
                autoStart
              />
              {phase === "countdown" && <CountdownOverlay count={countdown} />}
              {phase === "uploading" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "hsl(222 47% 7% / 0.75)", backdropFilter: "blur(4px)", borderRadius: "var(--radius-lg)", gap: 12 }}>
                  <Loader2 size={32} style={{ color: "hsl(258 90% 70%)", animation: "spin-slow 1s linear infinite" }} />
                  <p style={{ color: "white", fontSize: "0.9rem" }}>Uploading video…</p>
                </div>
              )}
              {phase === "scoring" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "hsl(222 47% 7% / 0.75)", backdropFilter: "blur(4px)", borderRadius: "var(--radius-lg)", gap: 12 }}>
                  <Loader2 size={32} style={{ color: "hsl(var(--color-success))", animation: "spin-slow 1s linear infinite" }} />
                  <p style={{ color: "white", fontSize: "0.9rem" }}>AI scoring your answer…</p>
                </div>
              )}
            </div>

            {/* Presence monitor */}
            {cameraStream && phase === "interview" && (
              <PresenceMonitor stream={cameraStream} onScoreChange={setPresenceScore} />
            )}

            {/* Progress */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: "0.82rem" }}>
                <span style={{ color: "hsl(var(--text-muted))" }}>Progress</span>
                <span style={{ fontWeight: 700, color: "hsl(258 90% 70%)" }}>Q{currentTurn} / {totalQuestions}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(currentTurn / totalQuestions) * 100}%`, background: "linear-gradient(90deg, hsl(258 90% 66%), hsl(330 85% 60%))" }} />
              </div>
              {answers.length > 0 && (
                <div style={{ marginTop: 10, fontSize: "0.78rem", color: "hsl(var(--text-muted))" }}>
                  Avg score: <strong style={{ color: "hsl(var(--text-primary))" }}>
                    {(answers.reduce((a, b) => a + b.scores.video_composite_score, 0) / answers.length).toFixed(1)}/10
                  </strong>
                </div>
              )}
            </div>

            {/* Transcript live */}
            {phase === "interview" && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  {isListening
                    ? <Mic size={14} style={{ color: "hsl(var(--color-danger))", animation: "pulse-glow 1s ease infinite" }} />
                    : <MicOff size={14} style={{ color: "hsl(var(--text-muted))" }} />}
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isListening ? "hsl(var(--color-danger))" : "hsl(var(--text-muted))" }}>
                    {isListening ? "Transcribing..." : "Mic off"}
                  </span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-secondary))", lineHeight: 1.6, minHeight: 48, maxHeight: 80, overflowY: "auto" }}>
                  {transcript || <span style={{ color: "hsl(var(--text-muted))", fontStyle: "italic" }}>Start speaking…</span>}
                </p>
              </div>
            )}
          </div>

          {/* Right: Question & answer column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Question card */}
            {currentQuestion && (phase === "interview" || phase === "feedback") && (
              <div className="card animate-fade-in" style={{ padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "hsl(258 90% 66% / 0.15)", color: "hsl(258 90% 70%)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Q{currentTurn} · {currentQuestion.question_type}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "hsl(var(--text-muted))" }}>
                    {role}
                  </span>
                </div>
                <p style={{ fontSize: "1.1rem", lineHeight: 1.65, color: "hsl(var(--text-primary))", fontWeight: 500 }}>
                  {currentQuestion.question_text}
                </p>
                {currentQuestion.follow_up_hint && (
                  <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "hsl(258 90% 66% / 0.06)", border: "1px solid hsl(258 90% 66% / 0.15)", fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                    💡 {currentQuestion.follow_up_hint}
                  </div>
                )}
              </div>
            )}

            {/* Submit button */}
            {phase === "interview" && (
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleSubmitAnswer}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center", background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))", fontSize: "1rem", padding: "14px 24px" }}
                >
                  <Send size={18} /> Submit Answer
                </button>
              </div>
            )}

            {/* Uploading / Scoring placeholder */}
            {(phase === "uploading" || phase === "scoring") && (
              <div className="card" style={{ padding: 32, textAlign: "center" }}>
                <Loader2 size={32} style={{ color: "hsl(258 90% 70%)", margin: "0 auto 16px", animation: "spin-slow 1s linear infinite" }} />
                <p style={{ color: "hsl(var(--text-secondary))" }}>
                  {phase === "uploading" ? "Uploading your video…" : "AI is analyzing your answer…"}
                </p>
              </div>
            )}

            {/* Feedback card */}
            {phase === "feedback" && currentScores && (
              <div className="card animate-fade-in" style={{ padding: 28 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: 20 }}>
                  Answer Feedback
                </h3>

                {/* Score rings */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 24 }}>
                  <ScoreRing score={currentScores.video_composite_score} label="Overall" size={88} />
                  <ScoreRing score={currentScores.score_clarity} label="Clarity" />
                  <ScoreRing score={currentScores.score_relevance} label="Relevance" />
                  <ScoreRing score={currentScores.score_structure} label="Structure" />
                  <ScoreRing score={currentScores.score_confidence} label="Confidence" />
                  <ScoreRing score={currentScores.score_presence} label="Eye Contact" />
                </div>

                {/* Feedback text */}
                <div style={{ padding: "14px 18px", borderRadius: "var(--radius-md)", background: "hsl(var(--bg-elevated))", marginBottom: 16, fontSize: "0.875rem", lineHeight: 1.7, color: "hsl(var(--text-secondary))" }}>
                  {currentScores.feedback}
                </div>

                {/* Sample answer */}
                <details style={{ marginBottom: 20 }}>
                  <summary style={{ cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "hsl(258 90% 70%)", userSelect: "none" }}>
                    💡 View strong answer example
                  </summary>
                  <div style={{ marginTop: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "hsl(258 90% 66% / 0.06)", border: "1px solid hsl(258 90% 66% / 0.15)", fontSize: "0.82rem", lineHeight: 1.7, color: "hsl(var(--text-secondary))" }}>
                    {currentScores.sample_answer}
                  </div>
                </details>

                {/* Video playback */}
                {currentVideoUrl && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(var(--text-muted))", marginBottom: 8 }}>Your recorded answer:</p>
                    <video src={currentVideoUrl} controls style={{ width: "100%", maxHeight: 180, borderRadius: "var(--radius-md)", background: "black" }} />
                  </div>
                )}

                {/* Continue / Finish */}
                {isLastQuestion ? (
                  <button onClick={handleComplete} disabled={loadingSummary} className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center", background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))" }}>
                    {loadingSummary ? <><Loader2 size={16} style={{ animation: "spin-slow 1s linear infinite" }} /> Generating Report…</> : <><Trophy size={16} /> Finish & Get Full Report</>}
                  </button>
                ) : (
                  <button onClick={handleContinue} className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center", background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))" }}>
                    Next Question <ChevronRight size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RESULTS
         ══════════════════════════════════════════════════════════════════════ */}
      {phase === "results" && summary && (
        <div className="animate-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Overall score hero */}
          <div className="card" style={{ padding: 40, textAlign: "center", marginBottom: 24, background: "linear-gradient(135deg, hsl(258 90% 66% / 0.08), hsl(330 85% 60% / 0.06))", border: "1px solid hsl(258 90% 66% / 0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              <Video size={18} style={{ color: "hsl(258 90% 70%)" }} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(258 90% 70%)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Video Interview Complete</span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "4.5rem", fontWeight: 900, letterSpacing: "-0.04em", background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>
              {summary.overall_score.toFixed(1)}
            </div>
            <div style={{ fontSize: "1.1rem", color: "hsl(var(--text-secondary))", marginBottom: 8 }}>out of 10</div>
            <div style={{ fontSize: "0.9rem", color: "hsl(var(--text-secondary))", maxWidth: 560, margin: "0 auto 24px", lineHeight: 1.7 }}>
              {summary.summary}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { icon: "📋", label: "Questions", value: totalQuestions },
                { icon: "👁️", label: "Avg Eye Contact", value: `${(answers.reduce((a, b) => a + b.presenceScore, 0) / Math.max(answers.length, 1)).toFixed(1)}/10` },
                { icon: "🎯", label: "Role", value: role },
              ].map((stat) => (
                <div key={stat.label} style={{ padding: "10px 20px", borderRadius: "var(--radius-md)", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))", textAlign: "center" }}>
                  <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{stat.icon}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{stat.value}</div>
                  <div style={{ fontSize: "0.7rem", color: "hsl(var(--text-muted))" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={16} style={{ color: "hsl(var(--color-success))" }} /> Strengths
              </h3>
              {summary.strengths.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: "0.85rem", color: "hsl(var(--text-secondary))", alignItems: "flex-start" }}>
                  <CheckCircle size={14} style={{ color: "hsl(var(--color-success))", flexShrink: 0, marginTop: 2 }} />
                  {s}
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} style={{ color: "hsl(var(--color-warning))" }} /> To Improve
              </h3>
              {summary.weaknesses.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: "0.85rem", color: "hsl(var(--text-secondary))", alignItems: "flex-start" }}>
                  <Target size={14} style={{ color: "hsl(var(--color-warning))", flexShrink: 0, marginTop: 2 }} />
                  {w}
                </div>
              ))}
            </div>
          </div>

          {/* Per-question breakdown */}
          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: 20 }}>
              Question Breakdown
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {answers.map((answer) => (
                <div key={answer.turn} style={{ padding: "16px 20px", borderRadius: "var(--radius-md)", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(258 90% 70%)", textTransform: "uppercase" }}>Q{answer.turn}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: 99, background: "hsl(var(--color-success) / 0.15)", color: "hsl(var(--color-success))", fontWeight: 700 }}>
                        Content: {answer.scores.composite_score.toFixed(1)}/10
                      </span>
                      <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: 99, background: "hsl(258 90% 66% / 0.15)", color: "hsl(258 90% 70%)", fontWeight: 700 }}>
                        Eye: {answer.presenceScore}/10
                      </span>
                      <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: 99, background: "hsl(var(--bg-overlay))", color: "hsl(var(--text-secondary))", fontWeight: 700 }}>
                        Final: {answer.scores.video_composite_score}/10
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))", marginBottom: 6, fontStyle: "italic" }}>
                    "{answer.question.question_text.slice(0, 100)}…"
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))", lineHeight: 1.5 }}>
                    {answer.scores.feedback}
                  </p>
                  {answer.videoUrl && (
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: "pointer", fontSize: "0.75rem", color: "hsl(258 90% 70%)", fontWeight: 600 }}>▶ Play recording</summary>
                      <video src={answer.videoUrl} controls style={{ width: "100%", maxHeight: 140, marginTop: 8, borderRadius: "var(--radius-md)", background: "black" }} />
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button onClick={handleReset} className="btn btn-primary"
              style={{ background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(330 85% 60%))" }}>
              <RotateCcw size={16} /> New Video Interview
            </button>
            <Link href="/interview" className="btn btn-secondary">
              <MessageCircle size={16} /> Switch to Text Mode
            </Link>
            <Link href="/dashboard" className="btn btn-secondary">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
