import type { Route } from "./+types/create-activity";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create Activity - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function CreateActivity() {
  return <></>;
}
