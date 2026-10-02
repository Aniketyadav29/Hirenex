"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "hsl(var(--bg-base))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "20%", left: "30%",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, hsl(220 90% 56% / 0.08), transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "var(--gradient-brand)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={22} color="white" />
            </div>
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 800,
              fontSize: "1.5rem", letterSpacing: "-0.03em",
              color: "hsl(var(--text-primary))",
            }}>
              Hire<span className="text-gradient">Nex</span>
            </span>
          </Link>
          <p style={{ marginTop: 12, color: "hsl(var(--text-secondary))", fontSize: "0.9rem" }}>
            Welcome back — let&apos;s ace your career
          </p>
        </div>

        <div className="card" style={{ padding: 36 }}>

          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 28,
            color: "hsl(var(--text-muted))", fontSize: "0.8rem",
          }}>
            <div style={{ flex: 1, height: 1, background: "hsl(var(--border-subtle))" }} />
            sign in with email
            <div style={{ flex: 1, height: 1, background: "hsl(var(--border-subtle))" }} />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 8, color: "hsl(var(--text-secondary))" }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }} />
                <input
                  id="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input"
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 8, color: "hsl(var(--text-secondary))" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }} />
                <input
                  id="input-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="input"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--text-muted))", padding: 0 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: "var(--radius-md)",
                background: "hsl(var(--color-danger) / 0.1)",
                border: "1px solid hsl(var(--color-danger) / 0.3)",
                color: "hsl(var(--color-danger))", fontSize: "0.85rem",
              }}>
                {error}
              </div>
            )}

            <button
              id="btn-login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" style={{ color: "hsl(var(--color-primary-light))", fontWeight: 600, textDecoration: "none" }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
