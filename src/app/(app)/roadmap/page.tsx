"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Compass,
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Trash2,
  BookOpen,
  Code2,
  Award,
  Zap,
  Loader2,
  Filter,
  CheckCircle,
  AlertCircle,
  Flame,
} from "lucide-react";
import type { RoadmapItem, RoadmapItemType, RoadmapItemStatus } from "@/types/database";

const TYPE_CONFIG: Record<
  RoadmapItemType,
  { label: string; icon: typeof BookOpen; color: string; bg: string }
> = {
  course: {
    label: "Course",
    icon: BookOpen,
    color: "hsl(217 91% 60%)",
    bg: "hsl(217 91% 60% / 0.12)",
  },
  project: {
    label: "Project",
    icon: Code2,
    color: "hsl(142 71% 45%)",
    bg: "hsl(142 71% 45% / 0.12)",
  },
  certification: {
    label: "Certification",
    icon: Award,
    color: "hsl(38 92% 50%)",
    bg: "hsl(38 92% 50% / 0.12)",
  },
  practice: {
    label: "Practice",
    icon: Zap,
    color: "hsl(326 100% 60%)",
    bg: "hsl(326 100% 60% / 0.12)",
  },
};

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | RoadmapItemStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | RoadmapItemType>("all");

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [genRole, setGenRole] = useState("");
  const [genFocus, setGenFocus] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Add Form State
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<RoadmapItemType>("project");
  const [newDesc, setNewDesc] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPriority, setNewPriority] = useState(3);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Fetch roadmap items
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const { createClient, SUPABASE_CONFIGURED } = await import("@/lib/supabase/client");
      if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("roadmap_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setItems(data as RoadmapItem[]);
        }
      }
    } catch (err) {
      console.error("Error fetching roadmap:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Toggle item status
  const handleToggleStatus = async (item: RoadmapItem) => {
    const nextStatus: RoadmapItemStatus =
      item.status === "completed"
        ? "in_progress"
        : item.status === "in_progress"
        ? "completed"
        : "in_progress";

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: nextStatus,
              completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
            }
          : i
      )
    );

    try {
      const res = await fetch("/api/roadmap/item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: nextStatus }),
      });
      if (!res.ok) {
        fetchItems(); // revert on fail
      }
    } catch {
      fetchItems();
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/roadmap/item?id=${id}`, { method: "DELETE" });
    } catch {
      fetchItems();
    }
  };

  // Generate AI Roadmap
  const handleGenerateAI = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: genRole, focusArea: genFocus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate roadmap");
      }
      setShowGenerateModal(false);
      await fetchItems();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Add Custom Goal
  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmittingAdd(true);
    try {
      const res = await fetch("/api/roadmap/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          item_type: newType,
          description: newDesc,
          url: newUrl,
          priority: newPriority,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewTitle("");
        setNewDesc("");
        setNewUrl("");
        await fetchItems();
      }
    } finally {
      setSubmittingAdd(false);
    }
  };

  const completedCount = items.filter((i) => i.status === "completed").length;
  const inProgressCount = items.filter((i) => i.status === "in_progress").length;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const filteredItems = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (typeFilter !== "all" && item.item_type !== typeFilter) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 64 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 999,
              background: "hsl(var(--primary) / 0.1)",
              border: "1px solid hsl(var(--primary) / 0.25)",
              color: "hsl(var(--primary))",
              fontSize: "0.8rem",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            <Compass size={14} />
            Target Readiness Path
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.1rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 6,
            }}
          >
            Career Learning Roadmap
          </h1>
          <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.95rem" }}>
            Personalized, milestone-driven trajectory designed to close skill gaps and maximize hiring readiness.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}
          >
            <Plus size={16} />
            Add Goal
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.9rem",
              boxShadow: "0 4px 20px hsl(var(--primary) / 0.35)",
            }}
          >
            <Sparkles size={16} />
            AI Roadmap Architect
          </button>
        </div>
      </div>

      {/* Progress & Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.85rem", color: "hsl(var(--text-secondary))", fontWeight: 500 }}>
              Milestones Progress
            </span>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--primary))" }}>
              {progressPct}%
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "hsl(var(--border))",
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                borderRadius: 999,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div style={{ fontSize: "0.8rem", color: "hsl(var(--text-secondary))" }}>
            {completedCount} of {items.length} milestones conquered
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "hsl(142 71% 45% / 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "hsl(142 71% 45%)",
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{completedCount}</div>
            <div style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))" }}>Completed Goals</div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "hsl(38 92% 50% / 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "hsl(38 92% 50%)",
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{inProgressCount}</div>
            <div style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))" }}>In Active Progress</div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "hsl(258 90% 66% / 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "hsl(258 90% 66%)",
            }}
          >
            <Flame size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              {items.filter((i) => i.status === "pending").length}
            </div>
            <div style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))" }}>Upcoming Targets</div>
          </div>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
          padding: "12px 18px",
          background: "hsl(var(--card))",
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
        }}
      >
        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", color: "hsl(var(--text-secondary))", display: "flex", alignItems: "center", gap: 4 }}>
            <Filter size={14} /> Status:
          </span>
          {(["all", "in_progress", "pending", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: statusFilter === s ? "hsl(var(--primary))" : "hsl(var(--muted))",
                color: statusFilter === s ? "white" : "hsl(var(--text-secondary))",
              }}
            >
              {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s === "pending" ? "Pending" : "Completed"}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {(["all", "course", "project", "certification", "practice"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: "0.78rem",
                fontWeight: 500,
                border: typeFilter === t ? "1px solid hsl(var(--primary))" : "1px solid transparent",
                cursor: "pointer",
                background: typeFilter === t ? "hsl(var(--primary) / 0.15)" : "transparent",
                color: typeFilter === t ? "hsl(var(--primary))" : "hsl(var(--text-secondary))",
              }}
            >
              {t === "all" ? "All Types" : TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Items List / Timeline */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <Loader2 size={36} className="animate-spin" style={{ color: "hsl(var(--primary))", margin: "0 auto 12px" }} />
          <p style={{ color: "hsl(var(--text-secondary))" }}>Loading your career trajectory...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "60px 24px",
            textAlign: "center",
            background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--background)))",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "hsl(var(--primary) / 0.12)",
              color: "hsl(var(--primary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Compass size={32} />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem", marginBottom: 8 }}>
            {items.length === 0 ? "No Roadmap Milestones Yet" : "No Milestones Match Filter"}
          </h2>
          <p style={{ color: "hsl(var(--text-secondary))", maxWidth: 440, margin: "0 auto 24px", fontSize: "0.92rem" }}>
            {items.length === 0
              ? "Let our AI analyze high-impact hiring requirements to architect a step-by-step career path for your target role."
              : "Try switching filters to view all roadmap goals."}
          </p>
          {items.length === 0 ? (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Sparkles size={16} />
              Generate My Roadmap with AI
            </button>
          ) : (
            <button
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="btn btn-secondary"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredItems.map((item, idx) => {
            const typeConf = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.project;
            const Icon = typeConf.icon;
            const isDone = item.status === "completed";
            const isInProgress = item.status === "in_progress";

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  transition: "all 0.2s ease",
                  borderLeft: `4px solid ${isDone ? "hsl(142 71% 45%)" : isInProgress ? "hsl(38 92% 50%)" : "hsl(var(--border))"}`,
                  opacity: isDone ? 0.75 : 1,
                }}
              >
                {/* Checkbox toggle */}
                <button
                  onClick={() => handleToggleStatus(item)}
                  title={`Status: ${item.status}. Click to cycle.`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: isDone
                      ? "hsl(142 71% 45%)"
                      : isInProgress
                      ? "hsl(38 92% 50%)"
                      : "hsl(var(--text-secondary))",
                    marginTop: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {isDone ? (
                    <CheckCircle2 size={24} />
                  ) : isInProgress ? (
                    <Clock size={24} />
                  ) : (
                    <Circle size={24} />
                  )}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 6,
                        background: typeConf.bg,
                        color: typeConf.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <Icon size={12} />
                      {typeConf.label}
                    </span>

                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background:
                          item.priority <= 2
                            ? "hsl(0 84% 60% / 0.12)"
                            : item.priority <= 4
                            ? "hsl(38 92% 50% / 0.12)"
                            : "hsl(var(--muted))",
                        color:
                          item.priority <= 2
                            ? "hsl(0 84% 60%)"
                            : item.priority <= 4
                            ? "hsl(38 92% 50%)"
                            : "hsl(var(--text-secondary))",
                      }}
                    >
                      Priority {item.priority}
                    </span>

                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "hsl(var(--text-secondary))",
                        marginLeft: "auto",
                      }}
                    >
                      {item.status === "completed"
                        ? "Completed"
                        : item.status === "in_progress"
                        ? "In Progress"
                        : "Queued"}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      marginBottom: 6,
                      textDecoration: isDone ? "line-through" : "none",
                      color: isDone ? "hsl(var(--text-secondary))" : "hsl(var(--text))",
                    }}
                  >
                    {item.title}
                  </h3>

                  {item.description && (
                    <p
                      style={{
                        fontSize: "0.88rem",
                        color: "hsl(var(--text-secondary))",
                        lineHeight: 1.55,
                        marginBottom: item.url ? 10 : 0,
                      }}
                    >
                      {item.description}
                    </p>
                  )}

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: "0.82rem",
                        color: "hsl(var(--primary))",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Explore Resource <ExternalLink size={13} />
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Remove item"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 6,
                      color: "hsl(var(--text-secondary))",
                      borderRadius: 6,
                      transition: "color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(0 84% 60%)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--text-secondary))")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate AI Modal */}
      {showGenerateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 520,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "hsl(var(--primary) / 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--primary))",
                }}
              >
                <Sparkles size={20} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>AI Roadmap Architect</h2>
            </div>
            <p style={{ fontSize: "0.88rem", color: "hsl(var(--text-secondary))", marginBottom: 20 }}>
              Antigravity AI will design a targeted milestone plan based on modern job expectations and production demands.
            </p>

            {errorMsg && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "hsl(0 84% 60% / 0.12)",
                  color: "hsl(0 84% 60%)",
                  fontSize: "0.85rem",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                Target Role
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Full Stack Engineer, Staff AI Engineer"
                value={genRole}
                onChange={(e) => setGenRole(e.target.value)}
                className="input"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                Focus Area or Weakness (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed systems, Kubernetes, System Design, GraphQL"
                value={genFocus}
                onChange={(e) => setGenFocus(e.target.value)}
                className="input"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="btn btn-secondary"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAI}
                className="btn btn-primary"
                disabled={generating}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Path...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Architect Roadmap
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Goal Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 520,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>Add Custom Goal</h2>
            <form onSubmit={handleAddCustom}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Docker & K8s Hands-On Lab"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as RoadmapItemType)}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    <option value="course">Course</option>
                    <option value="project">Project</option>
                    <option value="certification">Certification</option>
                    <option value="practice">Practice</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                    Priority (1-5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newPriority}
                    onChange={(e) => setNewPriority(parseInt(e.target.value) || 3)}
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Key deliverables, concepts to grasp, or checkpoints..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input"
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                  Resource URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={submittingAdd}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAdd}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  {submittingAdd ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
