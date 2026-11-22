import type { Route } from "./+types/api.polls.$pollId.resolve";
import { getSupabaseForRequest } from "~/lib/supabase.server";
import { pickWinner, type Resolution } from "~/lib/resolve-poll";

function errorResponse(status: number, code: string, message: string, extra?: object) {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

// POST /api/polls/:pollId/resolve: resolvePoll
// Body (optional): { "restaurant_id": "<uuid>" } to let the host pick the winner directly.
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST to resolve a poll");

  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  // body is optional
  let body: any = {};
  const text = await request.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      return errorResponse(400, "INVALID_INPUT", "Body must be valid JSON");
    }
  }

  // 1. look up the poll, its activity, and every option with its votes
  const { data: poll } = await auth.supabase
    .from("food_polls")
    .select("id, activity_id, winning_restaurant_id, resolved_by, activities(host_id), poll_options(id, restaurant_id, poll_votes(profile_id))")
    .eq("id", params.pollId)
    .maybeSingle();
  if (!poll) return errorResponse(404, "POLL_NOT_FOUND", "Poll not found");

  const p = poll as any;
  const activity = Array.isArray(p.activities) ? p.activities[0] : p.activities;

  // 2. business rules from the API doc
  if (activity?.host_id !== auth.user.id) return errorResponse(403, "ACCESS_DENIED", "Only the host can resolve the poll");
  if (p.winning_restaurant_id) {
    return errorResponse(409, "POLL_ALREADY_RESOLVED", "This poll is already resolved", {
      winning_restaurant_id: p.winning_restaurant_id,
      resolved_by: p.resolved_by,
    });
  }

  const options = (p.poll_options ?? []).map((o: any) => ({
    restaurant_id: o.restaurant_id as string,
    voters: (o.poll_votes ?? []).map((v: any) => v.profile_id as string),
  }));
  if (options.length === 0) return errorResponse(409, "NO_OPTIONS", "Add at least one restaurant before resolving");

  // 3. pick the winner
  let result: Resolution;
  if (body.restaurant_id != null) {
    // host override: has to be one of the options
    if (!options.some((o: any) => o.restaurant_id === body.restaurant_id)) {
      return errorResponse(400, "INVALID_INPUT", "That restaurant isn't an option in this poll");
    }
    result = { restaurant_id: body.restaurant_id, resolved_by: "host_override" };
  } else {
    const { count } = await auth.supabase
      .from("activity_members")
      .select("user_id", { count: "exact", head: true })
      .eq("activity_id", p.activity_id);
    result = pickWinner(options, count ?? 0);
  }

  // 4. save it, only if nobody resolved it in the meantime.
  // Two people resolving at once can't pick different winners: only the first update matches.
  const { data: updated, error } = await auth.supabase
    .from("food_polls")
    .update({ winning_restaurant_id: result.restaurant_id, resolved_by: result.resolved_by })
    .eq("id", p.id)
    .is("winning_restaurant_id", null)
    .select("id");

  if (error) {
    console.error("resolvePoll failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong resolving the poll");
  }
  if (!updated || updated.length === 0) {
    return errorResponse(409, "POLL_ALREADY_RESOLVED", "This poll was just resolved by someone else");
  }

  // 5. return the winner and the final counts
  const { data: winner } = await auth.supabase
    .from("restaurants")
    .select("id, name, cuisine, price_tier, address")
    .eq("id", result.restaurant_id)
    .maybeSingle();

  return Response.json({
    winner,
    resolved_by: result.resolved_by,
    vote_counts: options.map((o: any) => ({ restaurant_id: o.restaurant_id, votes: o.voters.length })),
  });
}
