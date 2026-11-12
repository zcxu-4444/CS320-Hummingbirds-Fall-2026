
import type { Route } from "./+types/api.activities.$id.cancel";
import { getSupabaseForRequest } from "~/lib/supabase.server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      { status: 405 }
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
      { status: 401 }
    );
  }

  const activityId = params.id;

  if (!activityId || !UUID_REGEX.test(activityId)) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Activity ID must be a valid UUID",
        },
        },
      { status: 400 }
    );
  }

  const { data: activity, error: lookupError } = await auth.supabase
    .from("activities")
    .select("id, host_id, status")
    .eq("id", activityId)
    .maybeSingle();

  if (lookupError) {
    console.error("cancelActivity lookup failed:", lookupError);
    return Response.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve activity",
        },
      },
      { status: 500 }
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
      { status: 404 }
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
      { status: 403 }
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
      { status: 409 }
    );
  }

  // This was written under the folloqing assumptioN:
  // Hosts may cancel an activity even after its scheduled start time,
  // provided its status is still "open".
  // If this assumption is unreasonable, lmk
  const { data, error } = await auth.supabase
    .from("activities")
    .update({ status: "cancelled" })
    .eq("id", activityId)
    .eq("host_id", auth.user.id)
    .eq("status", "open")
    .select(`
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
    `)
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
        { status: 403 }
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
      { status: 500 }
    );
  }

  if (!data) {
    return Response.json(
      {
        error: {
          code: "ACTIVITY_CLOSED",
          message: "Activity was changed or is no longer cancellable",
        },
      },
      { status: 409 }
    );
  }

  return Response.json({ activity: data });
}
