
import type { Route } from "./+types/home";
import { Discover } from "../discover/discover";
import { Welcome } from "../welcome/welcome";
import { getSupabaseServerClient } from "../supabase/server";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, responseHeaders } =
    getSupabaseServerClient(request);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return Response.json(
    { user: error ? null : user },
    { headers: responseHeaders }
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return user ? <Discover /> : <Welcome />;
}
