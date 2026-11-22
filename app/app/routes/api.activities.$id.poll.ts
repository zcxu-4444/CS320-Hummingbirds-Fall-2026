import type { Route } from "./+types/api.activities.$id.poll";
import { getSupabaseForRequest } from "~/lib/supabase.server";

function errorResponse(status: number, code: string, message: string, fields?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

// GET /api/activities/:id/poll: getFoodPoll
// Returns the poll, each restaurant option with its vote count, and which options you voted for.
export async function loader({ request, params }: Route.LoaderArgs) {
  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  const { data: poll, error } = await auth.supabase
    .from("food_polls")
    .select(
      "id, activity_id, deadline, winning_restaurant_id, resolved_by, " +
        "poll_options(id, restaurant_id, restaurants(id, name, cuisine, price_tier, address), poll_votes(profile_id))"
    )
    .eq("activity_id", params.id)
    .maybeSingle();

  if (error) {
    // a badly formatted id comes back as 22P02
    if (error.code === "22P02") return errorResponse(404, "POLL_NOT_FOUND", "No poll for this activity");
    console.error("getFoodPoll failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong getting the poll");
  }
  // also covers private activities you can't see: the security rules hide the poll
  if (!poll) return errorResponse(404, "POLL_NOT_FOUND", "No poll for this activity");

  const p = poll as any;
  const options = (p.poll_options ?? []).map((o: any) => ({
    id: o.id,
    restaurant: o.restaurants,
    vote_count: (o.poll_votes ?? []).length,
    voted_by_me: (o.poll_votes ?? []).some((v: any) => v.profile_id === auth.user.id),
  }));
  options.sort((a: any, b: any) => b.vote_count - a.vote_count);

  const winner = options.find((o: any) => o.restaurant?.id === p.winning_restaurant_id)?.restaurant ?? null;

  return Response.json({
    poll: {
      id: p.id,
      activity_id: p.activity_id,
      deadline: p.deadline,
      is_resolved: p.winning_restaurant_id !== null,
      winner,
      resolved_by: p.resolved_by,
      options,
      my_votes: options.filter((o: any) => o.voted_by_me).map((o: any) => o.id),
    },
  });
}

// POST /api/activities/:id/poll: createFoodPoll
// Body (optional): { "deadline": "2026-12-01T17:00:00Z" }
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST to create a poll");

  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  // body is optional, so an empty body is fine
  let body: any = {};
  const text = await request.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      return errorResponse(400, "INVALID_INPUT", "Body must be valid JSON");
    }
  }

  // 1. look up the activity
  const { data: activity, error: actError } = await auth.supabase
    .from("activities")
    .select("id, host_id, category, status, start_time")
    .eq("id", params.id)
    .maybeSingle();

  if (actError && actError.code !== "22P02") {
    console.error("createFoodPoll lookup failed:", actError);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong creating the poll");
  }
  if (!activity) return errorResponse(404, "ACTIVITY_NOT_FOUND", "Activity not found");

  // 2. business rules from the API doc
  if (activity.host_id !== auth.user.id) return errorResponse(403, "ACCESS_DENIED", "Only the host can create a poll");
  if (activity.category !== "food") return errorResponse(400, "INVALID_INPUT", "Polls are only for food activities");
  if (activity.status === "cancelled" || new Date(activity.start_time) <= new Date()) {
    return errorResponse(409, "ACTIVITY_CLOSED", "Can't create a poll for a cancelled or past activity");
  }

  // 3. deadline is optional, but must be in the future and before the activity starts
  let deadline: string | null = null;
  if (body.deadline != null) {
    const d = new Date(body.deadline);
    if (Number.isNaN(d.getTime())) {
      return errorResponse(400, "INVALID_INPUT", "Deadline must be a valid date", { deadline: "Must be a valid date" });
    }
    if (d <= new Date() || d >= new Date(activity.start_time)) {
      return errorResponse(400, "INVALID_INPUT", "Deadline must be in the future and before the activity starts", {
        deadline: "Must be in the future and before the activity starts",
      });
    }
    deadline = d.toISOString();
  }

  // 4. create it
  const { data: poll, error } = await auth.supabase
    .from("food_polls")
    .insert({ activity_id: activity.id, deadline })
    .select("id, activity_id, deadline, winning_restaurant_id, resolved_by")
    .single();

  if (error) {
    if (error.code === "23505") return errorResponse(409, "POLL_ALREADY_EXISTS", "This activity already has a poll");
    if (error.code === "42501") return errorResponse(403, "ACCESS_DENIED", "Only the host can create a poll");
    console.error("createFoodPoll failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong creating the poll");
  }

  return Response.json({ poll }, { status: 201 });
}
