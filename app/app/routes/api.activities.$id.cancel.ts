import { Uuid } from "~/lib/schema";
import type { Route } from "./+types/api.activities.$id.cancel";
import { getSupabaseForRequest } from "~/lib/supabase.server";

// POST /api/activities/:id/cancel
// Soft cancellation: preserves the activity, memberships, and polls.
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Use POST to cancel an activity",
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

  const activityId = params.id;
  if (!Uuid.validate(activityId)) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Activity ID must be a valid UUID",
        },
      },
      { status: 400 },
    );
  }

  const { data, error: lookupError } = await auth.supabase
    .from("activities")
    .select("id, host_id, status, start_time")
    .eq("id", activityId)
    .maybeSingle();
  const activity = data;

  if (lookupError) {
    console.error("cancelActivity lookup failed:", lookupError);
    return Response.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve activity",
        },
      },
      { status: 500 },
    );
  }

  if (!activity) {
    return Response.json(
      {
        error: {
          code: "ACTIVITY_NOT_FOUND",
          message: "Activity not found or not accessible",
        },
      },
      { status: 404 },
    );
  }

  if (activity.host_id !== auth.user.id) {
    return Response.json(
      {
        error: {
          code: "ACCESS_DENIED",
          message: "Only the host can cancel this activity",
        },
      },
      { status: 403 },
    );
  }

  if (activity.status !== "open") {
    return Response.json(
      {
        error: {
          code: "ACTIVITY_CLOSED",
          message: "Activity is already cancelled or completed",
        },
      },
      { status: 409 },
    );
  }


// Activities cannot be cancelled at or after their scheduled start time.
if (new Date(activity.start_time) <= new Date()) {
  return Response.json(
    {
      error: {
        code: "ACTIVITY_CLOSED",
        message: "Cannot cancel an activity that has already started",
      },
    },
    { status: 409 },
  );
}

  const { data: updatedData, error } = await auth.supabase
    .from("activities")
    .update({ status: "cancelled" })
    .eq("id", activityId)
    .eq("host_id", auth.user.id)
    .eq("status", "open")
    .gt("start_time", new Date().toISOString())
    .select(
      `
      id,
      host_id,
      title,
      description,
      category,
      location_name,
      start_time,
      capacity,
      status,
      created_at
    `,
    )
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return Response.json(
        {
          error: {
            code: "ACCESS_DENIED",
            message: "You cannot cancel this activity",
          },
        },
        { status: 403 },
      );
    }

    console.error("cancelActivity failed:", error);
    return Response.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Failed to cancel activity",
        },
      },
      { status: 500 },
    );
  }

  if (!updatedData) {
  return Response.json(
    {
      error: {
        code: "ACTIVITY_CLOSED",
        message: "Activity was changed or is no longer cancellable",
      },
    },
    { status: 409 },
  );
}

return Response.json({ activity: updatedData });
}
