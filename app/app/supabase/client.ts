
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient(
  url: string,
  publishableKey: string
) {
  return createBrowserClient(url, publishableKey);
}
