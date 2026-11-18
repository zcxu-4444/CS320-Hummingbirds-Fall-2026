import type { Route } from "./+types/api.restaurants";
import { getSupabaseForRequest } from "~/lib/supabase.server";

// GET /api/restaurants?cuisine=pizza&price_tier=1&search=anton
// Returns restaurants from our curated list, with optional filters.
export async function loader({ request }: Route.LoaderArgs) {
  // 1. check the user is logged in
  const auth = await getSupabaseForRequest(request);
  if (!auth) {
    return Response.json(
      { error: { code: "NOT_AUTHENTICATED", message: "Missing or invalid token" } },
      { status: 401 }
    );
  }

  // 2. read the filters from the URL
  const params = new URL(request.url).searchParams;
  const cuisine = params.get("cuisine")?.trim();
  const priceTier = params.get("price_tier");
  const search = params.get("search")?.trim();

  // 3. validate price_tier
  let tier: number | null = null;
  if (priceTier) {
    tier = Number(priceTier);
    if (![1, 2, 3].includes(tier)) {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: "price_tier must be 1, 2, or 3", fields: { price_tier: "Must be 1, 2, or 3" } } },
        { status: 400 }
      );
    }
  }

  // 4. build the query
  let query = auth.supabase
    .from("restaurants")
    .select("id, name, cuisine, price_tier, address")
    .order("name");

  // strip % and _ so the user can't inject their own wildcards
  const clean = (s: string) => s.replace(/[%_]/g, "");

  if (cuisine) query = query.ilike("cuisine", clean(cuisine));
  if (tier) query = query.eq("price_tier", tier);
  if (search) query = query.ilike("name", `%${clean(search)}%`);

  // 5. run it
  const { data, error } = await query;

  if (error) {
    console.error("getRestaurants failed:", error);
    return Response.json(
      { error: { code: "SERVER_ERROR", message: "Something went wrong getting restaurants" } },
      { status: 500 }
    );
  }

  return Response.json({ restaurants: data });
}
