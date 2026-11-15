
import type { Route } from "./+types/profile";
import { data } from "react-router";
import { requireAuth } from "../auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, responseHeaders } = await requireAuth(request);

  return data(
    {
      email: user.email ?? "",
      name: user.user_metadata?.full_name ?? "Not provided",
    },
    { headers: responseHeaders }
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function Profile({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div>
      <h1>My Profile</h1>
      <p>Email: {loaderData.email}</p>
      <p>Name: {loaderData.name}</p>
    </div>
  );
}
