
import { supabase } from "../lib/supabase";

// API 1: Get activities the current user has joined
export async function getMyActivities() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("ACCESS_DENIED");
  }

  const { data, error } = await supabase
    .from("activity_members")
    .select(`
      activity_id,
      joined_at,
      activities (*)
    `)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  return data ?? [];
}

// API 2: Leave an activity
export async function leaveActivity(activityId: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("ACCESS_DENIED");
  }

  const { data, error } = await supabase
    .from("activity_members")
    .delete()
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .select();

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("NOT_A_MEMBER_OR_ACCESS_DENIED");
  }

  return { success: true };
}


// API 3: Join a public activity
export async function joinActivity(activityId: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("ACCESS_DENIED");
  }
  const { data, error } = await supabase
    .from("activity_members")
    .insert({
      activity_id: activityId,
      user_id: user.id,
    })
    .select("activity_id, user_id, joined_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}


 // API 4: Join a private activity using an invitation code
export async function joinActivityByCode(joinCode: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("ACCESS_DENIED");
  }

  // Step 2: Validate the input
  const code = joinCode.trim();

  if (!code) {
    throw new Error("INVALID_JOIN_CODE");
  }
  const { data, error } = await supabase.rpc(
    "join_activity_by_code",
    { code }
  );

  if (error) {
    throw error;
  }
  return {
    activity_id: data,
    user_id: user.id,
  };
}
