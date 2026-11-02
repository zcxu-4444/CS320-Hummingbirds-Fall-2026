import type { Route } from "./+types/friends";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Friends - Activifind" },
    { name: "description", content: "" },
  ];
}

export default function Friends() {
  return <></>;
}
