"use client";

import { useRef, useState, useCallback, useImperativeHandle, forwardRef, useEffect } from "react";
import { Video, VideoOff, Circle, Square, RefreshCw } from "lucide-react";

export interface VideoRecorderHandle {
  startRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  resetRecording: () => void;
  stream: MediaStream | null;
}

interface VideoRecorderProps {
  onStreamReady?: (stream: MediaStream) => void;
  onStreamError?: (err: Error) => void;
  onRecordingComplete?: (blob: Blob) => void;
  width?: number;
  height?: number;
  showControls?: boolean;
  autoStart?: boolean;
  mirrored?: boolean;
}

const VideoRecorder = forwardRef<VideoRecorderHandle, VideoRecorderProps>(
  (
    {
      onStreamReady,
      onStreamError,
      onRecordingComplete,
      width = 360,
      height = 270,
      showControls = false,
      autoStart = true,
      mirrored = true,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const resolveRef = useRef<((blob: Blob | null) => void) | null>(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [recording, setRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startCamera = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true; // prevent echo
        }
        setCameraActive(true);
        setPermissionDenied(false);
        onStreamReady?.(stream);
      } catch (err) {
        setPermissionDenied(true);
        onStreamError?.(err as Error);
      }
    }, [onStreamReady, onStreamError]);

    useEffect(() => {
      if (autoStart) {
        startCamera();
      }
      return () => {
        // Cleanup stream on unmount
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [autoStart, startCamera]);

    const startRecording = useCallback(() => {
      if (!streamRef.current || recording) return;

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete?.(blob);
        resolveRef.current?.(blob);
        resolveRef.current = null;
      };

      recorder.start(200); // collect every 200ms
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    }, [recording, onRecordingComplete]);

    const stopRecording = useCallback((): Promise<Blob | null> => {
      return new Promise((resolve) => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
          resolve(null);
          return;
        }
        resolveRef.current = resolve;
        mediaRecorderRef.current.stop();
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      });
    }, []);

    const resetRecording = useCallback(() => {
      chunksRef.current = [];
      setRecording(false);
      setRecordingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording,
      resetRecording,
      get stream() {
        return streamRef.current;
      },
    }));

    const formatTime = (s: number) =>
      `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    return (
      <div style={{ position: "relative", width, height, borderRadius: "var(--radius-lg)", overflow: "hidden", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}>
        {/* Video element */}
        {!permissionDenied ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: mirrored ? "scaleX(-1)" : "none",
              opacity: cameraActive ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        ) : null}

        {/* Permission denied placeholder */}
        {permissionDenied && (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
            <VideoOff size={36} style={{ color: "hsl(var(--color-danger))" }} />
            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "hsl(var(--text-secondary))" }}>
              Camera access denied. Please allow camera & microphone permissions and refresh.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={startCamera}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Camera loading indicator */}
        {!cameraActive && !permissionDenied && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid hsl(var(--border-default))", borderTopColor: "hsl(var(--color-primary))", animation: "spin-slow 1s linear infinite" }} />
            <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>Initializing camera…</p>
          </div>
        )}

        {/* Recording indicator */}
        {recording && (
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: "hsl(0 84% 60% / 0.85)", backdropFilter: "blur(8px)" }}>
            <Circle size={8} style={{ color: "white", fill: "white", animation: "pulse-glow 1s ease infinite" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "white", fontFamily: "var(--font-mono)" }}>
              REC {formatTime(recordingSeconds)}
            </span>
          </div>
        )}

        {/* Controls (optional) */}
        {showControls && cameraActive && (
          <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10 }}>
            {!recording ? (
              <button
                onClick={startRecording}
                style={{ width: 44, height: 44, borderRadius: "50%", background: "hsl(var(--color-danger))", border: "3px solid white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
              >
                <Circle size={16} style={{ fill: "white", color: "white" }} />
              </button>
            ) : (
              <button
                onClick={() => stopRecording()}
                style={{ width: 44, height: 44, borderRadius: "50%", background: "hsl(var(--color-danger))", border: "3px solid white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
              >
                <Square size={14} style={{ fill: "white", color: "white" }} />
              </button>
            )}
          </div>
        )}

        {/* Vignette for style */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 60%, hsl(222 47% 7% / 0.4) 100%)", pointerEvents: "none" }} />
      </div>
    );
  }
);

VideoRecorder.displayName = "VideoRecorder";
export default VideoRecorder;
