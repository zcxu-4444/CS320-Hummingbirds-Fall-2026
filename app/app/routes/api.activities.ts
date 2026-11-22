import type { Route } from "./+types/api.activities";
import { getSupabaseForRequest } from "~/lib/supabase.server";

// GET /api/activities: list public, upcoming activities
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  // Read optional filters from the URL
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const limitParam = url.searchParams.get("limit");

  // Default to 20 activities, maximum 100
  const limit = limitParam === null ? 20 : Number(limitParam);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "limit must be an integer between 1 and 100",
        },
      },
      { status: 400 }
    );
  }

  // Reuse Yash's authentication helper
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

  let query = auth.supabase
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
      activity_members(count)
    `)
    .eq("is_private", false)
    .eq("status", "open")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(limit);

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAllActivities failed:", error);

    return Response.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve activities",
        },
      },
      { status: 500 }
    );
  }

  const activities = (data ?? []).map((activity) => {
    const { host, activity_members, ...fields } = activity;

    return {
      ...fields,
      host_name: host?.[0]?.full_name ?? null,
      member_count: activity_members?.[0]?.count ?? 0,
    };
  });

  return Response.json({ activities });
}

// POST /api/activities: creates an activity with the signed-in user as the host
export async function action({ request }: Route.ActionArgs) {
  // 1. only allow POST
  if (request.method !== "POST") {
    return Response.json(
      { error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to create an activity" } },
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
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Body must be valid JSON" } },
      { status: 400 }
    );
  }

    const errors: Record<string, string> = {};
  const categories = ["food", "sports", "study", "social", "games", "other"];

  if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 80) {
    errors.title = "Title must be 3-80 characters";
  }
  if (body.description != null && (typeof body.description !== "string" || body.description.length > 1000)) {
    errors.description = "Description must be at most 1000 characters";
  }
  if (!categories.includes(body.category)) {
    errors.category = `Category must be one of: ${categories.join(", ")}`;
  }
  if (typeof body.location_name !== "string" || !body.location_name.trim()) {
    errors.location_name = "Location is required";
  }
  const start = new Date(body.start_time);
  if (!body.start_time || Number.isNaN(start.getTime())) {
    errors.start_time = "Start time must be a valid date";
  } else if (start <= new Date()) {
    errors.start_time = "Activity must start in the future";
  }
  if (!Number.isInteger(body.capacity) || body.capacity < 2 || body.capacity > 50) {
    errors.capacity = "Capacity must be a whole number from 2 to 50";
  }
  if (body.is_private !== undefined && typeof body.is_private !== "boolean") {
    errors.is_private = "is_private must be true or false";
  }

  if (Object.keys(errors).length > 0) {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Some fields are invalid", fields: errors } },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("activities")
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      category: body.category,
      location_name: body.location_name.trim(),
      start_time: body.start_time,
      capacity: body.capacity,
      is_private: body.is_private ?? false,
      host_id: auth.user.id, // comes from the token, not the body
    })
    .select()
    .single();

    if (error) {
    // past start time (the db trigger blocks the host auto-join)
    if (error.message.includes("Activity has already started")) {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: "Activity must start in the future", fields: { start_time: "Activity must start in the future" } } },
        { status: 400 }
      );
    }
    // security rule blocked the insert
    if (error.code === "42501") {
      return Response.json(
        { error: { code: "ACCESS_DENIED", message: "You're not allowed to create this activity" } },
        { status: 403 }
      );
    }
    // host_id has no profile row yet
    if (error.code === "23503") {
      return Response.json(
        { error: { code: "PROFILE_NOT_FOUND", message: "Finish setting up your profile first" } },
        { status: 409 }
      );
    }
    // anything else: log it, but don't send raw db details to the user
    console.error("createActivity failed:", error);
    return Response.json(
      { error: { code: "SERVER_ERROR", message: "Something went wrong creating the activity" } },
      { status: 500 }
    );
  }

  return Response.json({ activity: data }, { status: 201 });
}