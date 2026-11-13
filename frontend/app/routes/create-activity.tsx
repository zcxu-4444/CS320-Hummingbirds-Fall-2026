import { requireAuth } from "~/auth.server";
import { data } from "react-router";
import type { Route } from "./+types/create-activity";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, responseHeaders } = await requireAuth(request);

  return data(
    {userId: user.id},
    {headers: responseHeaders},
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create Activity - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function CreateActivity() {
  return <h1>Create Activity</h1>;
}
