import type { Route } from "./+types/home";
import { Discover } from "../discover/discover";
import { Welcome } from "../welcome/welcome";
import { isLoggedIn } from "~/logic";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Activifind" },
    { name: "description", content: "Welcome to Activifind!" },
  ];
}

export default function Home() {
  return isLoggedIn() ? <Discover /> : <Welcome />;
}
