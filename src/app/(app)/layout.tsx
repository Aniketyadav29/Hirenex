import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

// ─── Demo-mode guard ──────────────────────────────────────────────────────────
// If Supabase credentials are not configured (local dev / no .env.local),
// render the layout with a placeholder user instead of crashing.
const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | undefined = "demo@hirenex.app";

  if (!DEMO_MODE) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth/login");
    }
    userEmail = user.email;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sidebar userEmail={userEmail} />

      {/* Main content */}
      <main
        style={{
          flex: 1,
          marginLeft: 260,
          minHeight: "100vh",
          background: "hsl(var(--bg-base))",
          overflowX: "hidden",
        }}
      >
        {/* Top header */}
        <header
          style={{
            height: 64,
            borderBottom: "1px solid hsl(var(--border-subtle))",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 32px",
            background: "hsl(var(--bg-surface) / 0.6)",
            backdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--gradient-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {userEmail?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: "32px" }}>{children}</div>
      </main>
    </div>
  );
}
