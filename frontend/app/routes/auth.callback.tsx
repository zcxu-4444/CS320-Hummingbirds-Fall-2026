
import type { Route } from "./+types/auth.callback";
import { getSupabaseServerClient } from "../supabase/server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const { supabase, responseHeaders } =
    getSupabaseServerClient(request);

  // Google must return an authorization code
  if (!code) {
    return new Response("Missing authorization code", {
      status: 400,
      headers: responseHeaders,
    });
  }

  // Exchange Google's authorization code for a Supabase session
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error.message);

    return new Response("Google authentication failed", {
      status: 401,
      headers: responseHeaders,
    });
  }

  // Retrieve the authenticated user from Supabase
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  // Initial email-domain eligibility check
  const emailAllowed =
    user?.email_confirmed_at != null &&
    user.email?.toLowerCase().endsWith("@umass.edu");

  const googleAccount =
    user?.app_metadata?.provider === "google" ||
    user?.app_metadata?.providers?.includes("google");

  if (userError || !user || !emailAllowed || !googleAccount) {
    await supabase.auth.signOut({ scope: "local" });

    return new Response("Only UMass Google accounts are allowed", {
      status: 403,
      headers: responseHeaders,
    });
  }

  // Successful authentication: redirect to the homepage
  responseHeaders.set("Location", "/");

  return new Response(null, {
    status: 303,
    headers: responseHeaders,
  });
}
