
import type { Route } from "./+types/api.activities.$id";
import { getSupabaseForRequest } from "~/lib/supabase.server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  if (!activityId || !UUID_REGEX.test(activityId)) {
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

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Body must be a JSON object" } },
      { status: 400 }
    );
  }

  const updates = body as Record<string, unknown>;

  // Only these fields may be edited.
  // In particular, id, host_id, created_at, status, and join_code are not editable.
  const allowedFields = [
    "title",
    "description",
    "category",
    "location_name",
    "start_time",
    "capacity",
  ] as const;

  const invalidFields = Object.keys(updates).filter(
    (key) => !allowedFields.includes(key as typeof allowedFields[number])
  );

  if (invalidFields.length > 0 || Object.keys(updates).length === 0) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: invalidFields.length > 0
            ? `Fields cannot be updated: ${invalidFields.join(", ")}`
            : "At least one field must be provided",
        },
      },
      { status: 400 }
    );
  }

  const errors: Record<string, string> = {};
  const validated: Record<string, string | number | null> = {};
  const categories = ["food", "sports", "study", "social", "games", "other"];

  if ("title" in updates) {
    if (
      typeof updates.title !== "string" ||
      updates.title.trim().length < 3 ||
      updates.title.trim().length > 80
    ) {
      errors.title = "Title must be 3-80 characters";
    } else {
      validated.title = updates.title.trim();
    }
  }

  if ("description" in updates) {
    if (
      updates.description !== null &&
      (typeof updates.description !== "string" ||
        updates.description.length > 1000)
    ) {
      errors.description = "Description must be at most 1000 characters";
    } else {
      validated.description = updates.description as string | null;
    }
  }

  if ("category" in updates) {
    if (typeof updates.category !== "string" || !categories.includes(updates.category)) {
      errors.category = `Category must be one of: ${categories.join(", ")}`;
    } else {
      validated.category = updates.category;
    }
  }

  if ("location_name" in updates) {
    if (
      typeof updates.location_name !== "string" ||
      !updates.location_name.trim()
    ) {
      errors.location_name = "Location is required";
    } else {
      validated.location_name = updates.location_name.trim();
    }
  }

  if ("start_time" in updates) {
    const start =
      typeof updates.start_time === "string"
        ? new Date(updates.start_time)
        : new Date(NaN);

    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      errors.start_time = "Start time must be a valid future date";
    } else {
      validated.start_time = start.toISOString();
    }
  }

  if ("capacity" in updates) {
    if (
      !Number.isInteger(updates.capacity) ||
      (updates.capacity as number) < 2 ||
      (updates.capacity as number) > 50
    ) {
      errors.capacity = "Capacity must be a whole number from 2 to 50";
    } else {
      validated.capacity = updates.capacity as number;
    }
  }

  if (Object.keys(errors).length > 0) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Some fields are invalid",
          fields: errors,
        },
      },
      { status: 400 }
    );
  }

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
  if ("capacity" in validated) {
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

    if ((validated.capacity as number) < count) {
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
