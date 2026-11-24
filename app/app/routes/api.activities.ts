import { Activity, NewActivity } from "~/lib/schema";
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

  const newActivity = NewActivity.safeParse(body);
  if (!newActivity.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid activity data",
          issues: newActivity.error.issues,
        },
      },
      { status: 400 }
    );
  }

  if (newActivity.data.start_time <= new Date()) {
    return Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Activity must start in the future",
          fields: { start_time: "Activity must start in the future" },
        },
      },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("activities")
    .insert({
      title: newActivity.data.title,
      description: newActivity.data.description,
      category: newActivity.data.category,
      location_name: newActivity.data.location_name,
      start_time: newActivity.data.start_time,
      capacity: newActivity.data.capacity,
      is_private: newActivity.data.is_private,
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

  return Response.json({ activity: Activity.parse(data) }, { status: 201 });
}