import type { Route } from "./+types/my-activities";
import { data } from "react-router";
import { requireAuth } from "~/auth.server";

export async function loader({request}: Route.LoaderArgs) {
  const { user, responseHeaders } = await requireAuth(request);

  return data(
    {userId: user.id},
    { headers: responseHeaders},
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Activities - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function MyActivities() {
  return <h1>My Activities</h1>;
}
