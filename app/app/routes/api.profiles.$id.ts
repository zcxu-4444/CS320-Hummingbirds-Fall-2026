import { z } from "zod";
import { getSupabaseForRequest } from "~/lib/supabase.server";
import type { Route } from "./+types/api.profiles.$id";
import { Profile } from "~/lib/schema";
import { errorResponse, PROFILE_FIELDS } from "./api.profiles";

// GET /api/profiles/:id
// Returns any user's profile (use your own user id to get your profile).
export async function loader({ request, params }: Route.LoaderArgs) {
  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  const id = z.uuid().safeParse(params.id);
  if (!id.success) return errorResponse(400, "INVALID_INPUT", "Profile id must be a valid UUID");

  const { data, error } = await auth.supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", id.data)
    .maybeSingle();

  if (error) {
    console.error("getProfile failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong getting the profile");
  }
  if (!data) return errorResponse(404, "PROFILE_NOT_FOUND", "Profile not found");

  return Response.json({ profile: Profile.parse(data) });
}
