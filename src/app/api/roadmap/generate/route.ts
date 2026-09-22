// ─── POST /api/roadmap/generate ──────────────────────────────────────────────
// Generates a tailored learning roadmap using LLM and saves to public.roadmap_items

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { llmJSON } from "@/lib/llm/client";
import type { LLMMessage } from "@/lib/llm/client";

interface GeneratedRoadmapItem {
  title: string;
  item_type: "course" | "project" | "certification" | "practice";
  description: string;
  priority: number;
  url?: string;
}

interface GenerateRoadmapBody {
  role?: string;
  focusArea?: string;
  level?: "beginner" | "intermediate" | "advanced";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as GenerateRoadmapBody;

    // Fetch user profile for default role if not provided
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("target_role, experience_yrs, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const profile = profileRaw as {
      target_role: string | null;
      experience_yrs: number | null;
      full_name: string | null;
    } | null;

    const targetRole = body.role || profile?.target_role || "Full Stack Developer";
    const focusArea = body.focusArea || "Industry readiness and technical depth";
    const level = body.level || (profile?.experience_yrs && profile.experience_yrs > 3 ? "advanced" : "intermediate");

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `You are an elite career coach and tech lead who creates actionable, high-impact career growth roadmaps.
Generate practical, step-by-step milestones (courses, hands-on projects, certifications, and practice routines) that give candidates an unfair advantage.
Return ONLY valid JSON matching the exact schema requested.`,
      },
      {
        role: "user",
        content: `Create a 6-step personalized learning roadmap for a ${level}-level candidate targeting the role: "${targetRole}".
Focus areas: ${focusArea}.

Each item must have:
- "title": Concise, motivating title
- "item_type": One of "course", "project", "certification", or "practice"
- "description": 2-3 sentences explaining exactly what to build, study, or achieve
- "priority": Integer from 1 (highest priority) to 5 (moderate)
- "url": (optional) A high-quality reputable resource link (e.g. docs, github, reputable learning resource)

Return JSON in this format:
{
  "items": [
    {
      "title": "Build a Distributed Task Queue in Go",
      "item_type": "project",
      "description": "Implement a redis-backed worker pool handling retries, dead letters, and rate limiting to prove backend systems mastery.",
      "priority": 1,
      "url": "https://github.com"
    }
  ]
}`,
      },
    ];

    let generatedItems: GeneratedRoadmapItem[] = [];

    try {
      const llmResult = await llmJSON<{ items: GeneratedRoadmapItem[] }>(messages, {
        temperature: 0.7,
      });
      if (Array.isArray(llmResult?.items) && llmResult.items.length > 0) {
        generatedItems = llmResult.items;
      }
    } catch (e) {
      console.warn("LLM roadmap generation failed or fallback needed:", e);
    }

    // Fallback if LLM returns empty or fails
    if (generatedItems.length === 0) {
      generatedItems = [
        {
          title: `Master Core Systems & Architecture for ${targetRole}`,
          item_type: "course",
          description: `Deep dive into architectural patterns, high concurrency, and data modeling relevant to modern ${targetRole} positions.`,
          priority: 1,
          url: "https://roadmap.sh",
        },
        {
          title: "Build & Deploy an End-to-End Production Application",
          item_type: "project",
          description: "Develop a robust, full-stack application with authentication, CI/CD pipelines, caching, and cloud deployment.",
          priority: 2,
          url: "https://github.com",
        },
        {
          title: "Solve 50 Targeted Technical & Algorithm Challenges",
          item_type: "practice",
          description: "Focus on graphs, dynamic programming, system design, and role-specific coding questions.",
          priority: 3,
          url: "https://leetcode.com",
        },
        {
          title: "Industry Cloud & Security Certification",
          item_type: "certification",
          description: "Earn an industry-recognized cloud practitioner or solutions architect credential to validate infrastructure skills.",
          priority: 4,
          url: "https://aws.amazon.com/certification",
        },
      ];
    }

    const serviceClient = createServiceClient();
    const rowsToInsert = generatedItems.map((item) => ({
      user_id: user.id,
      title: item.title,
      item_type: item.item_type,
      description: item.description,
      priority: Math.min(Math.max(item.priority || 3, 1), 10),
      url: item.url || null,
      status: "pending",
      source: "gap_report",
    }));

    const { data: inserted, error: insertError } = await serviceClient
      .from("roadmap_items")
      .insert(rowsToInsert as never)
      .select();

    if (insertError) {
      console.error("Failed to insert roadmap items:", insertError);
      return NextResponse.json({ error: "Failed to persist roadmap items" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      items: inserted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
