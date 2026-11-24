import { getSupabaseForRequest } from "~/lib/supabase.server";
import type { Route } from "./+types/api.profiles";

// Interests use the same list as activity categories.
export const INTEREST_OPTIONS = ["food", "sports", "study", "social", "games", "other"];
const NAME_MAX = 80;
const BIO_MAX = 300;
const PROFILE_FIELDS = "id, email, full_name, bio, interests, created_at";

function errorResponse(status: number, code: string, message: string, fields?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

// Checks full_name, bio and interests. When `partial` is true (PATCH), missing fields are skipped.
function validateProfile(body: any, partial: boolean) {
  const errors: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (!partial || body.full_name !== undefined) {
    const name = typeof body.full_name === "string" ? body.full_name.trim() : "";
    if (!name) errors.full_name = "Full name is required";
    else if (name.length > NAME_MAX) errors.full_name = `Full name must be at most ${NAME_MAX} characters`;
    else values.full_name = name;
  }

  if (body.bio !== undefined && body.bio !== null) {
    if (typeof body.bio !== "string") errors.bio = "Bio must be text";
    else if (body.bio.trim().length > BIO_MAX) errors.bio = `Bio must be at most ${BIO_MAX} characters`;
    else values.bio = body.bio.trim() || null;
  } else if (body.bio === null) {
    values.bio = null;
  }

  if (body.interests !== undefined) {
    if (
      !Array.isArray(body.interests) ||
      !body.interests.every((i: unknown) => typeof i === "string" && INTEREST_OPTIONS.includes(i))
    ) {
      errors.interests = `Interests must be a list from: ${INTEREST_OPTIONS.join(", ")}`;
    } else {
      values.interests = [...new Set(body.interests)];
    }
  }

  return { errors, values };
}

async function readJson(request: Request) {
  try {
    return { body: await request.json() };
  } catch {
    return { body: null };
  }
}

// GET /api/profiles
// Returns the signed-in user's profile.
export async function loader({ request }: Route.LoaderArgs) {
  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  const { data, error } = await auth.supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("getProfile failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong getting the profile");
  }
  if (!data) return errorResponse(404, "PROFILE_NOT_FOUND", "You haven't created a profile yet");

  return Response.json({ profile: data });
}

// POST  /api/profiles  creates the signed-in user's profile
// PATCH /api/profiles  updates full_name, bio and/or interests
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST" && request.method !== "PATCH") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST to create or PATCH to update your profile");
  }

  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  const { body } = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse(400, "INVALID_INPUT", "Body must be a JSON object");
  }

  const isUpdate = request.method === "PATCH";
  const { errors, values } = validateProfile(body, isUpdate);
  if (Object.keys(errors).length > 0) {
    return errorResponse(400, "INVALID_INPUT", "Some fields are invalid", errors);
  }

  // update
  if (isUpdate) {
    if (Object.keys(values).length === 0) {
      return errorResponse(400, "INVALID_INPUT", "Nothing to update");
    }
    const { data, error } = await auth.supabase
      .from("profiles")
      .update(values)
      .eq("id", auth.user.id)
      .select(PROFILE_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("updateProfile failed:", error);
      return errorResponse(500, "SERVER_ERROR", "Something went wrong updating the profile");
    }
    if (!data) return errorResponse(404, "PROFILE_NOT_FOUND", "You haven't created a profile yet");
    return Response.json({ profile: data });
  }

  // create
  const { data, error } = await auth.supabase
    .from("profiles")
    .insert({
      // these come from the validated login, not the request body
      id: auth.user.id,
      email: auth.user.email,
      interests: [],
      ...values,
    })
    .select(PROFILE_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") return errorResponse(409, "PROFILE_ALREADY_EXISTS", "You already have a profile");
    console.error("createProfile failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong creating the profile");
  }

  return Response.json({ profile: data }, { status: 201 });
}
