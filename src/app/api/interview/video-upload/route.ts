// ─── POST /api/interview/video-upload ─────────────────────────────────────────
// Accepts multipart form data: video blob + session_id + turn_index
// Uploads to Supabase Storage bucket "interview-recordings"
// Returns the signed URL for playback

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const videoBlob = formData.get("video") as File | null;
    const sessionId = formData.get("session_id") as string | null;
    const turnIndexRaw = formData.get("turn_index") as string | null;

    if (!videoBlob || !sessionId || !turnIndexRaw) {
      return NextResponse.json({ error: "video, session_id, and turn_index are required" }, { status: 400 });
    }

    const turnIndex = parseInt(turnIndexRaw, 10);
    const serviceSupabase = createServiceClient();

    // Verify session belongs to user
    const { data: sessionRaw } = await serviceSupabase
      .from("interview_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (!sessionRaw) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const session = sessionRaw as { id: string; user_id: string };
    if (session.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Build storage path
    const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
    const storagePath = `${user.id}/${sessionId}/${turnIndex}.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await videoBlob.arrayBuffer();
    const { error: uploadError } = await serviceSupabase.storage
      .from("interview-recordings")
      .upload(storagePath, arrayBuffer, {
        contentType: videoBlob.type || "video/webm",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload video" }, { status: 500 });
    }

    // Generate a signed URL valid for 7 days
    const { data: signedData, error: signError } = await serviceSupabase.storage
      .from("interview-recordings")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

    if (signError || !signedData) {
      return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
    }

    const videoUrl = signedData.signedUrl;

    // Update interview_qa row with the video URL
    await serviceSupabase
      .from("interview_qa")
      .update({ answer_video_url: videoUrl } as never)
      .eq("session_id", sessionId)
      .eq("turn_index", turnIndex);

    // Update interview_sessions with last video URL
    await serviceSupabase
      .from("interview_sessions")
      .update({ video_url: videoUrl, mode: "video" } as never)
      .eq("id", sessionId);

    return NextResponse.json({ success: true, video_url: videoUrl, storage_path: storagePath });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
