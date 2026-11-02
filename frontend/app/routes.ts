import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("my-activities", "routes/my-activities.tsx"),
  route("create-activity", "routes/create-activity.tsx"),
  route("friends", "routes/friends.tsx"),
  route("profile", "routes/profile.tsx"),
] satisfies RouteConfig;
