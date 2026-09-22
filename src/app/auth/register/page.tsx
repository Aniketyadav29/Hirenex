"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      // Auto-login and redirect after a brief moment
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--bg-base))" }}>
        <div className="card" style={{ padding: 48, textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", marginBottom: 12 }}>Account Created!</h2>
          <p style={{ color: "hsl(var(--text-secondary))" }}>Redirecting you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "hsl(var(--bg-base))", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "30%", right: "25%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, hsl(258 90% 66% / 0.08), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={22} color="white" />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", color: "hsl(var(--text-primary))" }}>
              Hire<span className="text-gradient">Nex</span>
            </span>
          </Link>
          <p style={{ marginTop: 12, color: "hsl(var(--text-secondary))", fontSize: "0.9rem" }}>
            Create your free account — takes 30 seconds
          </p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          {/* OAuth Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            <button id="btn-register-google" onClick={() => handleOAuth("google")} className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <button id="btn-register-github" onClick={() => handleOAuth("github")} className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
              <Github size={18} />
              Continue with GitHub
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, color: "hsl(var(--text-muted))", fontSize: "0.8rem" }}>
            <div style={{ flex: 1, height: 1, background: "hsl(var(--border-subtle))" }} />
            or register with email
            <div style={{ flex: 1, height: 1, background: "hsl(var(--border-subtle))" }} />
          </div>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 8, color: "hsl(var(--text-secondary))" }}>Full Name</label>
              <div style={{ position: "relative" }}>
                <User size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }} />
                <input id="input-fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required className="input" style={{ paddingLeft: 40 }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 8, color: "hsl(var(--text-secondary))" }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }} />
                <input id="input-reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="input" style={{ paddingLeft: 40 }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 8, color: "hsl(var(--text-secondary))" }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }} />
                <input id="input-reg-password" type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required className="input" style={{ paddingLeft: 40, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--text-muted))", padding: 0 }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "hsl(var(--color-danger) / 0.1)", border: "1px solid hsl(var(--color-danger) / 0.3)", color: "hsl(var(--color-danger))", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            <button id="btn-register-submit" type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading ? "Creating account..." : "Create Free Account"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>
            Already have an account?{" "}
            <Link href="/auth/login" style={{ color: "hsl(var(--color-primary-light))", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
