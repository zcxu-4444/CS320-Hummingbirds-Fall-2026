import type { Route } from "./+types/profile";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function Profile() {
  return <></>;
}
