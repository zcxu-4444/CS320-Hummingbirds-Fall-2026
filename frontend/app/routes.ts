import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("my-activities", "routes/my-activities.tsx"),
  route("create-activity", "routes/create-activity.tsx"),
  route("profile", "routes/profile.tsx"),
  route("auth/google", "routes/auth.google.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
