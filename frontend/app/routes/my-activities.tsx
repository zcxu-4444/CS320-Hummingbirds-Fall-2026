import type { Route } from "./+types/my-activities";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Activities - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function MyActivities() {
  return <></>;
}
