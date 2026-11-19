import type { Route } from "./+types/api.polls.$pollId.options";
import { getSupabaseForRequest } from "~/lib/supabase.server";

function errorResponse(status: number, code: string, message: string, fields?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

// POST /api/polls/:pollId/options: addPollOption
// Body: { "restaurant_id": "<uuid>" }
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST to add an option");

  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_INPUT", "Body must be valid JSON");
  }
  if (typeof body?.restaurant_id !== "string" || !body.restaurant_id) {
    return errorResponse(400, "INVALID_INPUT", "restaurant_id is required", { restaurant_id: "Required" });
  }

  // 1. look up the poll and who hosts its activity
  const { data: poll } = await auth.supabase
    .from("food_polls")
    .select("id, winning_restaurant_id, activities(host_id)")
    .eq("id", params.pollId)
    .maybeSingle();
  if (!poll) return errorResponse(404, "POLL_NOT_FOUND", "Poll not found");

  const p = poll as any;
  const activity = Array.isArray(p.activities) ? p.activities[0] : p.activities;

  // 2. business rules from the API doc
  if (p.winning_restaurant_id) return errorResponse(409, "POLL_CLOSED", "This poll is already resolved");
  if (activity?.host_id !== auth.user.id) return errorResponse(403, "ACCESS_DENIED", "Only the host can add options");

  // 3. the restaurant has to exist
  const { data: restaurant } = await auth.supabase
    .from("restaurants")
    .select("id")
    .eq("id", body.restaurant_id)
    .maybeSingle();
  if (!restaurant) {
    return errorResponse(400, "INVALID_INPUT", "Restaurant not found", { restaurant_id: "Restaurant not found" });
  }

  // 4. add it
  const { data: option, error } = await auth.supabase
    .from("poll_options")
    .insert({ poll_id: p.id, restaurant_id: restaurant.id })
    .select("id, poll_id, restaurant_id")
    .single();

  if (error) {
    if (error.code === "23505") return errorResponse(409, "DUPLICATE_OPTION", "That restaurant is already in this poll");
    if (error.code === "42501") return errorResponse(403, "ACCESS_DENIED", "Only the host can add options");
    console.error("addPollOption failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong adding the option");
  }

  return Response.json({ option }, { status: 201 });
}
