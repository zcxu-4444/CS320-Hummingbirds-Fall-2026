
import type { Route } from "./+types/auth.google";
import { getSupabaseServerClient } from "../supabase/server";

export async function action({ request }: Route.ActionArgs) {
  const { supabase, responseHeaders } =
    getSupabaseServerClient(request);

  const origin = new URL(request.url).origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        hd: "umass.edu",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    console.error("Google OAuth error:", error);
    return new Response("Unable to start Google sign-in", {
      status: 500,
      headers: responseHeaders,
    });
  }

  responseHeaders.set("Location", data.url);

  return new Response(null, {
    status: 303,
    headers: responseHeaders,
  });
}
