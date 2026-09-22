import Link from "next/link";
import {
  Brain,
  FileText,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  Shield,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Virtual Interviewer",
    description:
      "Practice with an AI that asks dynamic, role-specific questions and gives real-time feedback on your answers.",
    badge: "Text · Voice · Video",
    gradient: "from-blue-500 to-violet-600",
    href: "/interview",
  },
  {
    icon: FileText,
    title: "Resume Analyzer",
    description:
      "Upload your resume and get instant ATS scoring, skill extraction, and a side-by-side gap analysis against any job description.",
    badge: "PDF · DOCX",
    gradient: "from-violet-500 to-pink-600",
    href: "/resume",
  },
  {
    icon: MessageSquare,
    title: "Skill Assessment Engine",
    description:
      "Adaptive quizzes across technical, behavioral, and domain-specific topics that get harder as you improve.",
    badge: "MCQ · Coding · Aptitude",
    gradient: "from-emerald-500 to-cyan-600",
    href: "/tests",
  },
  {
    icon: BarChart3,
    title: "Career Intelligence Dashboard",
    description:
      "One unified view of your readiness score, skill profile, and a personalized roadmap to land your target role.",
    badge: "Live Progress",
    gradient: "from-amber-500 to-orange-600",
    href: "/dashboard",
  },
];

const stats = [
  { value: "95%", label: "Interview success rate" },
  { value: "3×", label: "Faster skill gap closure" },
  { value: "50+", label: "Supported job roles" },
  { value: "10k+", label: "Practice questions" },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "hsl(var(--bg-base))",
        overflowX: "hidden",
      }}
    >
      {/* ── Navigation ── */}
      <nav
        className="glass"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid hsl(var(--border-subtle))",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--gradient-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} color="white" />
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.2rem",
                letterSpacing: "-0.03em",
              }}
            >
              Hire<span className="text-gradient">Nex</span>
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/auth/login" className="btn btn-ghost btn-sm">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn btn-primary btn-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          padding: "100px 32px 80px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Glow orbs */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "20%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, hsl(220 90% 56% / 0.12), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "20%",
            right: "15%",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, hsl(258 90% 66% / 0.1), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          <div
            className="badge badge-primary animate-fade-in"
            style={{ marginBottom: 24, display: "inline-flex" }}
          >
            <Sparkles size={12} />
            Powered by Llama 3 · Self-hosted AI
          </div>

          <h1
            className="animate-fade-in"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              marginBottom: 24,
              animationDelay: "80ms",
            }}
          >
            Land Your Dream Job with{" "}
            <span className="text-gradient">AI-Powered</span> Career Coaching
          </h1>

          <p
            className="animate-fade-in"
            style={{
              fontSize: "1.2rem",
              color: "hsl(var(--text-secondary))",
              lineHeight: 1.7,
              marginBottom: 40,
              maxWidth: 600,
              margin: "0 auto 40px",
              animationDelay: "160ms",
            }}
          >
            Practice interviews with a real AI, analyze your resume, close skill
            gaps, and track your readiness — all in one platform.
          </p>

          <div
            className="animate-fade-in"
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
              animationDelay: "240ms",
            }}
          >
            <Link href="/auth/register" className="btn btn-primary btn-xl">
              Start for Free
              <ArrowRight size={20} />
            </Link>
            <Link href="/auth/login" className="btn btn-secondary btn-xl">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: "48px 32px" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 24,
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="card"
              style={{ padding: "28px 24px", textAlign: "center" }}
            >
              <div
                className="text-gradient"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2.4rem",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "hsl(var(--text-secondary))",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "80px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 800,
                marginBottom: 16,
                letterSpacing: "-0.03em",
              }}
            >
              Everything you need to{" "}
              <span className="text-gradient">ace your career</span>
            </h2>
            <p
              style={{
                color: "hsl(var(--text-secondary))",
                fontSize: "1.1rem",
                maxWidth: 500,
                margin: "0 auto",
              }}
            >
              Four deeply integrated modules that work together to accelerate your
              career growth.
            </p>
          </div>

          <div
            className="stagger-children"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.title}
                  href={f.href}
                  className="card animate-fade-in"
                  style={{
                    padding: 28,
                    textDecoration: "none",
                    display: "block",
                    transition: "transform 250ms ease, box-shadow 250ms ease",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
                      backgroundImage: `linear-gradient(135deg, ${
                        f.gradient.includes("blue")
                          ? "hsl(220 90% 56%)"
                          : f.gradient.includes("violet") &&
                            !f.gradient.includes("pink")
                          ? "hsl(258 90% 66%)"
                          : f.gradient.includes("emerald")
                          ? "hsl(142 72% 50%)"
                          : "hsl(38 95% 64%)"
                      }, ${
                        f.gradient.includes("violet") &&
                        f.gradient.includes("blue")
                          ? "hsl(258 90% 66%)"
                          : f.gradient.includes("pink")
                          ? "hsl(330 85% 60%)"
                          : f.gradient.includes("cyan")
                          ? "hsl(196 80% 54%)"
                          : "hsl(25 95% 60%)"
                      })`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    <Icon size={24} color="white" />
                  </div>

                  <div
                    className="badge badge-muted"
                    style={{ marginBottom: 12, fontSize: "0.7rem" }}
                  >
                    {f.badge}
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      marginBottom: 10,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "hsl(var(--text-secondary))",
                      lineHeight: 1.6,
                      marginBottom: 20,
                    }}
                  >
                    {f.description}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.85rem",
                      color: "hsl(var(--color-primary-light))",
                      fontWeight: 600,
                    }}
                  >
                    Explore <ChevronRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Trust / Value Props ── */}
      <section style={{ padding: "80px 32px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            className="card"
            style={{
              padding: "56px 48px",
              background:
                "linear-gradient(135deg, hsl(220 90% 56% / 0.08), hsl(258 90% 66% / 0.06))",
              border: "1px solid hsl(var(--color-primary) / 0.2)",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                fontWeight: 800,
                marginBottom: 16,
                letterSpacing: "-0.03em",
              }}
            >
              Your data stays private.{" "}
              <span className="text-gradient">AI runs locally.</span>
            </h2>
            <p
              style={{
                color: "hsl(var(--text-secondary))",
                fontSize: "1rem",
                maxWidth: 560,
                margin: "0 auto 40px",
                lineHeight: 1.7,
              }}
            >
              HireNex uses self-hosted Llama 3 — your resume, answers, and
              personal data never leave our servers or get sent to third-party AI
              APIs.
            </p>

            <div
              style={{
                display: "flex",
                gap: 32,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  icon: Shield,
                  label: "Self-hosted LLM",
                  sub: "No data to OpenAI/Anthropic",
                },
                {
                  icon: Zap,
                  label: "Real-time Feedback",
                  sub: "Instant scoring per answer",
                },
                {
                  icon: Target,
                  label: "Role-specific AI",
                  sub: "50+ job role templates",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: "hsl(var(--color-primary) / 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "hsl(var(--color-primary-light))",
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "hsl(var(--text-primary))",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "hsl(var(--text-muted))",
                      }}
                    >
                      {item.sub}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "80px 32px 120px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 20,
            }}
          >
            Ready to level up your career?
          </h2>
          <p
            style={{
              color: "hsl(var(--text-secondary))",
              fontSize: "1.05rem",
              marginBottom: 36,
              lineHeight: 1.7,
            }}
          >
            Upload your resume and get your first skill gap report in under 60
            seconds. Free, forever.
          </p>
          <Link href="/auth/register" className="btn btn-primary btn-xl">
            <Sparkles size={20} />
            Start Your Free Analysis
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid hsl(var(--border-subtle))",
          padding: "32px",
          textAlign: "center",
          color: "hsl(var(--text-muted))",
          fontSize: "0.85rem",
        }}
      >
        © {new Date().getFullYear()} HireNex. Built with self-hosted AI for your
        privacy.
      </footer>
    </main>
  );
}
