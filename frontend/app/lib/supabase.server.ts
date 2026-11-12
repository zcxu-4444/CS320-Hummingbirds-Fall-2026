import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Makes a Supabase client that acts AS the signed-in user, using the token
// the frontend sends. This keeps our database security rules working.
export async function getSupabaseForRequest(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return { supabase, user: data.user };
}