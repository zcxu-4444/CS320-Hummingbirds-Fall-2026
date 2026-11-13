import { redirect } from "react-router";
import { getSupabaseServerClient } from "./supabase/server";

export async function requireAuth(request: Request) {
    const { supabase, responseHeaders } = getSupabaseServerClient(request);

    const {
        data: {user },
        error,
    } = await supabase.auth.getUser();

    // Ensure user is authenticated
    if (error || !user) {
        throw redirect("/", {
            headers: responseHeaders,
        });
    }

    // Check Umass email eligibility 
    const isUmassEmail = 
        user.email_confirmed_at != null &&
        user.email?.toLowerCase().endsWith("@umass.edu");

    // Ensure a Google identity is linked 
    const hasGoogleIdentity = 
        user.identities?.some(
            (identity) => identity.provider == "google"
        ) ?? false;

    if (!isUmassEmail || !hasGoogleIdentity) {
        // Clear the rejected session
        await supabase.auth.signOut({scope: "local"});

        throw redirect("/", {
            headers: responseHeaders
        });
    }

    // Allow the request
    responseHeaders.set("Cache-Control", 'private, no-store');

    return { user, supabase, responseHeaders};
}