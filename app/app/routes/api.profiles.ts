import { getSupabaseForRequest } from "~/lib/supabase.server";
import type { Route } from "./+types/api.profiles";
import { NewProfile, Profile } from "~/lib/schema";

export const PROFILE_FIELDS = "id, email, full_name, bio, interests, created_at";

export function errorResponse(status: number, code: string, message: string, extra?: object) {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

// GET /api/profiles isn't supported, use GET /api/profiles/:id to get one profile
export async function loader() {
  return errorResponse(405, "METHOD_NOT_ALLOWED", "Use GET /api/profiles/:id to get a profile");
}

// POST  /api/profiles  creates the signed-in user's profile
// PATCH /api/profiles  updates full_name, bio and/or interests
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST" && request.method !== "PATCH") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST to create or PATCH to update your profile");
  }

  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_INPUT", "Body must be valid JSON");
  }

  // update: every field is optional, but at least one has to be sent
  if (request.method === "PATCH") {
    const updates = NewProfile.partial().safeParse(body);
    if (!updates.success) {
      return errorResponse(400, "INVALID_INPUT", "Invalid profile data", { issues: updates.error.issues });
    }
    if (Object.keys(updates.data).length === 0) {
      return errorResponse(400, "INVALID_INPUT", "Nothing to update");
    }

    const { data, error } = await auth.supabase
      .from("profiles")
      .update(updates.data)
      .eq("id", auth.user.id)
      .select(PROFILE_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("updateProfile failed:", error);
      return errorResponse(500, "SERVER_ERROR", "Something went wrong updating the profile");
    }
    if (!data) return errorResponse(404, "PROFILE_NOT_FOUND", "You haven't created a profile yet");

    return Response.json({ profile: Profile.parse(data) });
  }

  // create
  // interests are optional at signup, so default them to an empty list
  const newProfile = NewProfile.safeParse({ interests: [], ...(body as object) });
  if (!newProfile.success) {
    return errorResponse(400, "INVALID_INPUT", "Invalid profile data", { issues: newProfile.error.issues });
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .insert({
      // Important: These both come from the validated auth token, not the user's request body.
      id: auth.user.id,
      email: auth.user.email,
      ...newProfile.data,
    })
    .select(PROFILE_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") return errorResponse(409, "PROFILE_ALREADY_EXISTS", "You already have a profile");
    console.error("createProfile failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong creating the profile");
  }

  return Response.json({ profile: Profile.parse(data) }, { status: 201 });
}
