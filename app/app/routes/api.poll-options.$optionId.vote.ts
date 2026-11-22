import type { Route } from "./+types/api.poll-options.$optionId.vote";
import { getSupabaseForRequest } from "~/lib/supabase.server";

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

// POST   /api/poll-options/:optionId/vote: voteForOption
// DELETE /api/poll-options/:optionId/vote: unvoteForOption
// Approval voting: you can vote for several restaurants, but only once per restaurant.
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST" && request.method !== "DELETE") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST to vote or DELETE to unvote");
  }

  const auth = await getSupabaseForRequest(request);
  if (!auth) return errorResponse(401, "NOT_AUTHENTICATED", "Missing or invalid token");

  // 1. look up the option and its poll
  const { data: option } = await auth.supabase
    .from("poll_options")
    .select("id, food_polls(id, activity_id, deadline, winning_restaurant_id)")
    .eq("id", params.optionId)
    .maybeSingle();
  if (!option) return errorResponse(404, "OPTION_NOT_FOUND", "Poll option not found");

  const o = option as any;
  const poll = Array.isArray(o.food_polls) ? o.food_polls[0] : o.food_polls;

  // 2. can't vote or unvote once the poll is resolved or past its deadline
  const pastDeadline = poll.deadline && new Date(poll.deadline) <= new Date();
  if (poll.winning_restaurant_id || pastDeadline) {
    return errorResponse(409, "POLL_CLOSED", "Voting is closed for this poll");
  }

  // 3. only members of the activity can vote
  const { data: member } = await auth.supabase
    .from("activity_members")
    .select("user_id")
    .eq("activity_id", poll.activity_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!member) return errorResponse(403, "ACCESS_DENIED", "Only members of this activity can vote");

  // 4a. unvote
  if (request.method === "DELETE") {
    const { data: removed, error } = await auth.supabase
      .from("poll_votes")
      .delete()
      .eq("option_id", o.id)
      .eq("profile_id", auth.user.id)
      .select("id");

    if (error) {
      console.error("unvoteForOption failed:", error);
      return errorResponse(500, "SERVER_ERROR", "Something went wrong removing your vote");
    }
    if (!removed || removed.length === 0) return errorResponse(404, "VOTE_NOT_FOUND", "You haven't voted for this option");
    return Response.json({ removed: true });
  }

  // 4b. vote
  const { data: vote, error } = await auth.supabase
    .from("poll_votes")
    .insert({ option_id: o.id, profile_id: auth.user.id })
    .select("id, option_id, profile_id")
    .single();

  if (error) {
    if (error.code === "23505") return errorResponse(409, "ALREADY_VOTED", "You already voted for this option");
    if (error.code === "42501") return errorResponse(403, "ACCESS_DENIED", "Only members of this activity can vote");
    console.error("voteForOption failed:", error);
    return errorResponse(500, "SERVER_ERROR", "Something went wrong saving your vote");
  }

  return Response.json({ vote }, { status: 201 });
}
