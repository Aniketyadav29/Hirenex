"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Brain,
  ClipboardList,
  Map,
  Users,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { createClient, SUPABASE_CONFIGURED } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";


const navItems = [
  {
    group: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/resume", label: "Resume Analyzer", icon: FileText },
      { href: "/tests", label: "Skill Tests", icon: ClipboardList },
      { href: "/interview", label: "AI Interviewer", icon: Brain },
      { href: "/roadmap", label: "My Roadmap", icon: Map },
    ],
  },
  {
    group: "Recruiter",
    items: [
      { href: "/recruiter", label: "Recruiter Portal", icon: Users },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/profile", label: "Profile & Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = SUPABASE_CONFIGURED ? createClient() : null;
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut();
    router.push("/");
  }

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid hsl(var(--border-subtle))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--gradient-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} color="white" />
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.1rem",
              letterSpacing: "-0.03em",
              color: "hsl(var(--text-primary))",
            }}
          >
            Hire<span className="text-gradient">Nex</span>
          </span>
        </Link>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setMobileOpen(false)}
          style={{ display: "none", padding: 6 }}
          id="btn-close-sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Groups */}
      <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
        {navItems.map((group) => (
          <div key={group.group} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "hsl(var(--text-muted))",
                padding: "0 8px",
                marginBottom: 6,
              }}
            >
              {group.group}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon
                    size={17}
                    className="sidebar-icon"
                    style={{
                      color: isActive
                        ? "hsl(var(--color-primary))"
                        : "hsl(var(--text-muted))",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && (
                    <ChevronRight
                      size={14}
                      style={{ color: "hsl(var(--color-primary) / 0.5)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div
        style={{
          padding: "12px 12px 16px",
          borderTop: "1px solid hsl(var(--border-subtle))",
        }}
      >
        {userEmail && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              background: "hsl(var(--bg-elevated))",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "hsl(var(--text-muted))",
                marginBottom: 2,
              }}
            >
              Signed in as
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "hsl(var(--text-secondary))",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userEmail}
            </div>
          </div>
        )}
        <button
          id="btn-sign-out"
          onClick={handleSignOut}
          className="sidebar-link"
          style={{ color: "hsl(var(--color-danger))", width: "100%" }}
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar" style={{ display: "flex" }}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: "hsl(var(--bg-surface))",
          borderBottom: "1px solid hsl(var(--border-subtle))",
          zIndex: 30,
          alignItems: "center",
          padding: "0 16px",
          justifyContent: "space-between",
        }}
        id="mobile-topbar"
      >
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setMobileOpen(true)}
          style={{ padding: 8 }}
          id="btn-open-sidebar"
        >
          <Menu size={20} />
        </button>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1rem",
          }}
        >
          Hire<span className="text-gradient">Nex</span>
        </span>
        <Bell size={20} style={{ color: "hsl(var(--text-muted))" }} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "hsl(0 0% 0% / 0.6)",
            zIndex: 39,
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className="sidebar"
        style={{
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform var(--transition-base)",
          zIndex: 40,
          display: "flex",
        }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
