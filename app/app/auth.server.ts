import { redirect } from "react-router";
import { getSupabaseServerClient } from "./supabase/server";

export async function requireAuth(request: Request) {
    const { supabase, responseHeaders } = getSupabaseServerClient(request);

    const {
        data: {user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        throw redirect("/", {
            headers: responseHeaders,
        });
    }

    responseHeaders.set("Cache-Control", 'private, no-store');

    return { user, supabase, responseHeaders};
}