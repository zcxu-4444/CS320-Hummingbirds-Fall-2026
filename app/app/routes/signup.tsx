import type { Route } from "./+types/signup";
import { currentProfile, type Profile } from "~/logic";
import { requireAuth } from "~/auth.server";
import { data, useLoaderData } from "react-router";
import type { User } from "@supabase/supabase-js";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, responseHeaders } = await requireAuth(request);
  return data({ user }, { headers: responseHeaders });
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up - Activifind" },
    { name: "description", content: "Create your Activifind profile." },
  ];
}

export default function SignupPage() {
  const { user } = useLoaderData<{ user: User }>();
  return <>Welcome, {user.email}</>;
}
