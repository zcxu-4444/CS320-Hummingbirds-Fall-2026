import "dotenv/config";
import { createClient, type User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "~/supabase/server";

// Only confirmed @umass.edu accounts can use the API.
function isUmassUser(user: User) {
  return (
    user.email_confirmed_at != null &&
    (user.email ?? "").toLowerCase().endsWith("@umass.edu")
  );
}

// Makes a Supabase client that acts AS the signed-in user, so our database
// security rules still apply. Works two ways:
//   1. Cookie session: what the app uses after Google sign-in (the browser sends it automatically)
//   2. Authorization: Bearer <token> header: handy for testing with curl
// Returns null if nobody valid is signed in, so API routes can return a 401.
export async function getSupabaseForRequest(request: Request) {
  console.log(request);
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  // 1. bearer token (curl / testing)
  if (token) {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      },
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user || !isUmassUser(data.user)) return null;
    return { supabase, user: data.user };
  }

  // 2. cookie session (the real app)
  const { supabase } = getSupabaseServerClient(request);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !isUmassUser(data.user)) return null;
  return { supabase, user: data.user };
}
