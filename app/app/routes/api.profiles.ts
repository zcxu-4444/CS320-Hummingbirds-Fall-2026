import { getSupabaseForRequest } from "~/lib/supabase.server";
import type { Route } from "./+types/api.profiles";
import { NewProfile, Profile } from "~/lib/schema";

// POST /api/profiles
// Create a new profile for the signed-in user.
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Use POST to create a new profile",
        },
      },
      { status: 405 },
    );
  }

  const auth = await getSupabaseForRequest(request);

  if (!auth) {
    return Response.json(
      {
        error: {
          code: "NOT_AUTHENTICATED",
          message: "Missing or invalid token",
        },
      },
      { status: 401 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Body must be valid JSON" } },
      { status: 400 },
    );
  }

  let newProfile = NewProfile.safeParse(body);
  if (!newProfile.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid profile data",
          issues: newProfile.error.issues,
        },
      },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .insert({
      // Important: These both come from the validated auth token, not the user's request body.
      id: auth.user.id,
      email: auth.user.email,
      full_name: newProfile.data.full_name,
      bio: newProfile.data.bio,
      interests: newProfile.data.interests,
      created_at: new Date(),
    })
    .select()
    .single();

  if (error) {
    // anything else: log it, but don't send raw db details to the user
    console.error("profile creation failed:", error);
    return Response.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Something went wrong creating the profile",
        },
      },
      { status: 500 },
    );
  }

  const profile = Profile.parse(data);
  return Response.json({ profile }, { status: 201 });
}
