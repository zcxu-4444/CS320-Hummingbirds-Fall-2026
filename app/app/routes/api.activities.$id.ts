import { Uuid, UpdateActivity } from "~/lib/schema";
import type { Route } from "./+types/api.activities.$id";
import { getSupabaseForRequest } from "~/lib/supabase.server";

// GET /api/activities/:id
export async function loader({ request, params }: Route.LoaderArgs) {
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

  if (!activityId || !Uuid.validate(activityId)) {
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

  const { data, error } = await auth.supabase
    .from("activities")
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
      created_at,
      host:profiles!activities_host_id_fkey(full_name),
      activity_members(user_id)
    `)
    .eq("id", activityId)
    .maybeSingle();

  if (error) {
    console.error("getActivityById failed:", error);

    if (error.code === "42501") {
      return Response.json(
        {
          error: {
            code: "ACCESS_DENIED",
            message: "You cannot access this activity",
          },
        },
        { status: 403 }
      );
    }

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

  if (!data) {
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

  const members = data.activity_members ?? [];
  const memberCount = members.length;

  const { host, activity_members, ...fields } = data;

  return Response.json({
    activity: {
      ...fields,
      host_name: host?.[0]?.full_name ?? null,
      member_count: memberCount,
      is_joined: members.some(
        (member) => member.user_id === auth.user.id
      ),
      is_host: data.host_id === auth.user.id,
      is_full: memberCount >= data.capacity,
    },
  });
}



// PATCH /api/activities/:id
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "PATCH") {
    return Response.json(
      { error: { code: "METHOD_NOT_ALLOWED", message: "Use PATCH to update an activity" } },
      { status: 405 }
    );
  }

  const auth = await getSupabaseForRequest(request);

  if (!auth) {
    return Response.json(
      { error: { code: "NOT_AUTHENTICATED", message: "Missing or invalid token" } },
      { status: 401 }
    );
  }

  const activityId = params.id;

  if (!activityId || !Uuid.validate(activityId)) {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Activity ID must be a valid UUID" } },
      { status: 400 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Body must be valid JSON" } },
      { status: 400 }
    );
  }

 const parsed = UpdateActivity.safeParse(body);

if (!parsed.success) {
  const fields: Record<string, string> = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];

    if (typeof field === "string") {
      fields[field] = issue.message;
    }
  }

  return Response.json(
    {
      error: {
        code: "INVALID_INPUT",
        message: "Invalid activity data",
        issues: parsed.error.issues,
        fields,
      },
    },
    { status: 400 }
  );
}

const validated = parsed.data;

  // Fetch the existing activity to check ownership and status.
  const { data: activity, error: lookupError } = await auth.supabase
    .from("activities")
    .select("id, host_id, status, start_time, capacity")
    .eq("id", activityId)
    .maybeSingle();

  if (lookupError) {
    console.error("updateActivity lookup failed:", lookupError);
    return Response.json(
      { error: { code: "SERVER_ERROR", message: "Failed to retrieve activity" } },
      { status: 500 }
    );
  }

  if (!activity) {
    return Response.json(
      { error: { code: "ACTIVITY_NOT_FOUND", message: "Activity not found or not accessible" } },
      { status: 404 }
    );
  }

  if (activity.host_id !== auth.user.id) {
    return Response.json(
      { error: { code: "ACCESS_DENIED", message: "Only the host can edit this activity" } },
      { status: 403 }
    );
  }

  if (activity.status !== "open") {
    return Response.json(
      { error: { code: "ACTIVITY_CLOSED", message: "Cannot edit a cancelled or completed activity" } },
      { status: 409 }
    );
  }

  // This was written under the assumption that 
  // Hosts cannot edit activities after their scheduled start time
  // Whoever is reading this, let me know if we want that changed!
  if (new Date(activity.start_time) <= new Date()) {
    return Response.json(
      { error: { code: "ACTIVITY_CLOSED", message: "Cannot edit an activity that has already started" } },
      { status: 409 }
    );
  }

  // Ensure capacity is not reduced below the current membership count.
  if (validated.capacity !== undefined) {
    const { count, error: countError } = await auth.supabase
      .from("activity_members")
      .select("*", { count: "exact", head: true })
      .eq("activity_id", activityId);

    if (countError || count === null) {
      console.error("updateActivity member count failed:", countError);
      return Response.json(
        { error: { code: "SERVER_ERROR", message: "Failed to verify membership count" } },
        { status: 500 }
      );
    }

    if (validated.capacity < count) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Capacity cannot be below the current member count",
            fields: { capacity: `At least ${count} spots are required` },
          },
        },
        { status: 400 }
      );
    }
  }

  const { data, error } = await auth.supabase
    .from("activities")
    .update(validated)
    .eq("id", activityId)
    .eq("host_id", auth.user.id)
    .eq("status", "open")
    .gt("start_time", new Date().toISOString())
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
        { error: { code: "ACCESS_DENIED", message: "You cannot update this activity" } },
        { status: 403 }
      );
    }

    console.error("updateActivity failed:", error);
    return Response.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update activity" } },
      { status: 500 }
    );
  }

  if (!data) {
    return Response.json(
      {
        error: {
          code: "ACTIVITY_CLOSED",
          message: "Activity was changed or is no longer editable",
        },
      },
      { status: 409 }
    );
  }

  return Response.json({ activity: data });
}
