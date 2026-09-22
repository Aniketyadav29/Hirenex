// ─── Supabase Client (Server-side / Route Handlers / Server Actions) ──────────
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient() {
  if (!SUPABASE_CONFIGURED) {
    // Return a no-op stub in demo mode
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }) }) }) }) }),
      }),
    } as never;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can't set cookies — middleware handles this
          }
        },
      },
    }
  );
}

// ─── Service Role Client (bypasses RLS — for background jobs only) ────────────
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Return a no-op stub in demo mode
    return {
      from: () => ({
        select: () => ({
          eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }) }) }) }),
          in: () => ({ order: () => ({ data: [], error: null }) }),
          ilike: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      }),
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    } as never;
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
