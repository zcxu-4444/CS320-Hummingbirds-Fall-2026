import type { Route } from "./+types/logout";
import { getSupabaseServerClient } from "../supabase/server";

export async function action({ request }: Route.ActionArgs) {
    const { supabase, responseHeaders } = getSupabaseServerClient(request)

    // End the local Supabase auth session
    const { error } = await supabase.auth.signOut({
        scope: "local",
    });

    if (error) {
        console.error("Logout failed:", error.message);

        return new Response("Unable to log out", {
            status: 500,
            headers: responseHeaders,
        })
    }

    // Return to homepage
    responseHeaders.set("Location", "/");

    return new Response(null, {
        status: 303,
        headers: responseHeaders,
    })
}