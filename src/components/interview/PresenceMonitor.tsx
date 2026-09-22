"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PresenceMonitorProps {
  /** Pass either a live MediaStream OR an existing HTMLVideoElement */
  videoElement?: HTMLVideoElement | null;
  stream?: MediaStream | null;
  enabled?: boolean;
  onScoreChange?: (score: number) => void;
}

/**
 * Lightweight browser-native presence heuristic.
 * Samples a central region of the video feed via a hidden canvas every 500ms.
 * If the center pixel region has sufficient variance/brightness → face detected near camera.
 * Tracks ratio of "on-camera" frames to produce an eye-contact score (0–10).
 *
 * Accepts either a videoElement prop OR a stream prop (creates own hidden video).
 */
export default function PresenceMonitor({ videoElement: externalVideo, stream, enabled = true, onScoreChange }: PresenceMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const frameCountRef = useRef(0);
  const onCameraCountRef = useRef(0);
  const [score, setScore] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastSampleRef = useRef(0);

  // Attach stream to internal video if provided
  useEffect(() => {
    if (stream && internalVideoRef.current) {
      internalVideoRef.current.srcObject = stream;
      internalVideoRef.current.muted = true;
      internalVideoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Pick the video source — prefer external, then internal
  const getVideoElement = useCallback((): HTMLVideoElement | null => {
    if (externalVideo && externalVideo.readyState >= 2) return externalVideo;
    if (internalVideoRef.current && internalVideoRef.current.readyState >= 2) return internalVideoRef.current;
    return null;
  }, [externalVideo]);

  const sampleFrame = useCallback(() => {
    const vid = getVideoElement();
    if (!vid || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sample a 60×60 pixel center crop of the video
    const vw = vid.videoWidth || 640;
    const vh = vid.videoHeight || 480;
    const sx = Math.floor(vw / 2 - 30);
    const sy = Math.floor(vh / 2 - 30);

    canvas.width = 60;
    canvas.height = 60;

    try {
      ctx.drawImage(vid, sx, sy, 60, 60, 0, 0, 60, 60);
    } catch {
      return; // cross-origin or video not ready
    }

    const imageData = ctx.getImageData(0, 0, 60, 60);
    const data = imageData.data;

    // Compute mean brightness and variance
    let sum = 0;
    let sumSq = 0;
    const pixelCount = 60 * 60;

    for (let i = 0; i < data.length; i += 4) {
      // Luminance approximation
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum;
      sumSq += lum * lum;
    }

    const mean = sum / pixelCount;
    const variance = sumSq / pixelCount - mean * mean;

    // Heuristic: face in center = medium brightness (30–220) AND sufficient variance (> 150)
    const brightEnough = mean > 30 && mean < 230;
    const variantEnough = variance > 150;
    const detected = brightEnough && variantEnough;

    frameCountRef.current++;
    if (detected) onCameraCountRef.current++;

    const ratio = frameCountRef.current > 0 ? onCameraCountRef.current / frameCountRef.current : 0;
    const newScore = Math.min(10, Math.round(ratio * 10 * 1.1)); // slight boost

    setFaceDetected(detected);
    setScore(newScore);
    onScoreChange?.(newScore);
  }, [getVideoElement, onScoreChange]);

  useEffect(() => {
    if (!enabled) return;

    const loop = (timestamp: number) => {
      if (timestamp - lastSampleRef.current > 500) {
        sampleFrame();
        lastSampleRef.current = timestamp;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, sampleFrame]);

  const scoreColor =
    score >= 8 ? "hsl(var(--color-success))" :
    score >= 5 ? "hsl(var(--color-warning))" :
    "hsl(var(--color-danger))";

  const circumference = 2 * Math.PI * 18;

  return (
    <>
      {/* Hidden canvas for pixel sampling */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Hidden video for stream-based mode */}
      {stream && (
        <video
          ref={internalVideoRef}
          autoPlay
          playsInline
          muted
          style={{ display: "none" }}
        />
      )}

      {/* Presence HUD overlay card */}
      <div style={{
        background: "hsl(var(--bg-surface) / 0.9)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${faceDetected ? "hsl(var(--color-success) / 0.3)" : "hsl(var(--color-danger) / 0.3)"}`,
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "border-color 0.4s ease",
      }}>
        {/* Mini score ring */}
        <svg width={44} height={44} viewBox="0 0 44 44">
          <circle cx={22} cy={22} r={18} fill="none" stroke="hsl(var(--bg-overlay))" strokeWidth={4} />
          <circle
            cx={22} cy={22} r={18}
            fill="none"
            stroke={scoreColor}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${(score / 10) * circumference} ${circumference}`}
            transform="rotate(-90 22 22)"
            style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }}
          />
          <text x={22} y={26} textAnchor="middle" fill={scoreColor} fontSize={11} fontWeight={800} fontFamily="Outfit, sans-serif">
            {score}
          </text>
        </svg>

        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
            Eye Contact
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 600, color: faceDetected ? "hsl(var(--color-success))" : "hsl(var(--text-muted))" }}>
            {faceDetected ? <Eye size={12} /> : <EyeOff size={12} />}
            {faceDetected ? "On camera" : "Look at camera"}
          </div>
        </div>
      </div>
    </>
  );
}
