import { getSupabaseBrowserClient } from "../supabase/client";
export type Restaurant = {
  id: string;
  name: string;
  cuisine: string | null;
  price_tier: number | null;
  address: string | null;
};

export type PollOption = {
  id: string;
  restaurant: Restaurant;
  vote_count: number;
  voted_by_me: boolean;
};

export type FoodPoll = {
  id: string;
  activity_id: string;
  deadline: string | null;
  is_resolved: boolean;
  winner: Restaurant | null;
  resolved_by: string | null;
  options: PollOption[];
  my_votes: string[];
};

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

async function apiRequest<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data: ApiError = await response.json().catch(() => ({}));

    throw new Error(
      data.error?.message ||
        `Request failed (${response.status})`
    );
  }

  return response.json() as Promise<T>;
}

// GET: Load the food poll for an activity
export async function getFoodPoll(
  activityId: string,
  accessToken: string
): Promise<FoodPoll> {
  const data = await apiRequest<{ poll: FoodPoll }>(
    `/api/activities/${encodeURIComponent(activityId)}/poll`,
    accessToken
  );

  return data.poll;
}

// POST: Host creates a food poll
export async function createFoodPoll(
  activityId: string,
  accessToken: string,
  deadline?: string
): Promise<void> {
  await apiRequest(
    `/api/activities/${encodeURIComponent(activityId)}/poll`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(
        deadline ? { deadline } : {}
      ),
    }
  );
}

// GET: Search existing restaurants in the catalog
export async function searchRestaurants(
  search: string,
  accessToken: string
): Promise<Restaurant[]> {
  const params = new URLSearchParams({ search });

  const data = await apiRequest<{
    restaurants: Restaurant[];
  }>(
    `/api/restaurants?${params.toString()}`,
    accessToken
  );

  return data.restaurants;
}

// POST: Host adds a restaurant to the food poll
export async function addPollOption(
  pollId: string,
  restaurantId: string,
  accessToken: string
): Promise<void> {
  await apiRequest(
    `/api/polls/${encodeURIComponent(pollId)}/options`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        restaurant_id: restaurantId,
      }),
    }
  );
}

// POST: Activity member votes for a restaurant
export async function voteForOption(
  optionId: string,
  accessToken: string
): Promise<void> {
  await apiRequest(
    `/api/poll-options/${encodeURIComponent(optionId)}/vote`,
    accessToken,
    {
      method: "POST",
    }
  );
}

// DELETE: Activity member removes their own vote
export async function unvoteForOption(
  optionId: string,
  accessToken: string
): Promise<void> {
  await apiRequest(
    `/api/poll-options/${encodeURIComponent(optionId)}/vote`,
    accessToken,
    {
      method: "DELETE",
    }
  );
}
export async function getFoodAccessToken(): Promise<string> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase browser configuration");
  }

  const supabase = getSupabaseBrowserClient(url, key);

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error("Please sign in with Google first.");
  }

  return session.access_token;
}


export function getTiedRestaurants(poll: FoodPoll): string[] {
  if (poll.options.length < 2) {
    return [];
  }

  const highestVotes = Math.max(
    ...poll.options.map((option) => option.vote_count)
  );

  const tiedOptions = poll.options.filter(
    (option) => option.vote_count === highestVotes
  );

  if (tiedOptions.length < 2) {
    return [];
  }

  return tiedOptions
    .map((option) => option.restaurant?.name)
    .filter((name): name is string => Boolean(name));
}
