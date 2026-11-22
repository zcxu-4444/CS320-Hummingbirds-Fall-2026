import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("my-activities", "routes/my-activities.tsx"),
  route("create-activity", "routes/create-activity.tsx"),
  route("profile", "routes/profile.tsx"),
  // API
  route("api/activities", "routes/api.activities.ts"),
  route("api/activities/:id", "routes/api.activities.$id.ts"),
  route("api/activities/:id/cancel", "routes/api.activities.$id.cancel.ts"),
  route("api/restaurants", "routes/api.restaurants.ts"),
  route("api/activities/:id/poll", "routes/api.activities.$id.poll.ts"),
  route("api/polls/:pollId/options", "routes/api.polls.$pollId.options.ts"),
  route("api/poll-options/:optionId/vote", "routes/api.poll-options.$optionId.vote.ts"),
  route("api/polls/:pollId/resolve", "routes/api.polls.$pollId.resolve.ts"),
  route("auth/google", "routes/auth.google.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
