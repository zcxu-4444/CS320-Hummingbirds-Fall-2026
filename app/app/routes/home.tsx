import type { Route } from "./+types/home";
import { Discover } from "../discover/discover";
import { Welcome } from "../welcome/welcome";
import { getSupabaseServerClient } from "~/supabase/server";
import { requireFullProfile } from "~/auth.server";
import { isAuthSessionMissingError } from "@supabase/supabase-js";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, responseHeaders } = getSupabaseServerClient(request);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error && !isAuthSessionMissingError(error)) {
    console.error("Error fetching user:", error.message);
  }

  if (user) {
    const { user, profile } = await requireFullProfile(request);
    return Response.json({ user, profile }, { headers: responseHeaders });
  }

  return Response.json({ user }, { headers: responseHeaders });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return user ? <Discover /> : <Welcome />;
}
