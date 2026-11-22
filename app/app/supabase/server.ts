
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

export function getSupabaseServerClient(request: Request) {
  const responseHeaders = new Headers();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return parseCookieHeader(
          request.headers.get("Cookie") ?? ""
        );
      },

      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value, options }) => {
          responseHeaders.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options)
          );
        });

        Object.entries(cacheHeaders).forEach(([key, value]) => {
          responseHeaders.set(key, value);
        });
      },
    },
  });

  return { supabase, responseHeaders };
}
