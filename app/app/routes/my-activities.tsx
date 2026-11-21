import type { Route } from "./+types/my-activities";
import { MyActivities as MyActivitiesList } from "~/components/MyActivities";
import { data } from "react-router";
import { requireFullProfile } from "~/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, responseHeaders } = await requireFullProfile(request);

  return data({ userId: user.id }, { headers: responseHeaders });
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Activities - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function MyActivities() {
  return <MyActivitiesList />;
}
