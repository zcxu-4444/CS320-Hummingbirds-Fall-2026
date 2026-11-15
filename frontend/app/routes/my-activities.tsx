import type { Route } from "./+types/my-activities";
import { MyActivities as MyActivitiesList } from "~/components/MyActivities";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Activities - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function MyActivities() {
  return <MyActivitiesList />;
}
