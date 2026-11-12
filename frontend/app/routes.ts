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
] satisfies RouteConfig;
