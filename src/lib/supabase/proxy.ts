import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database.generated";

export async function updateSupabaseSession(request: NextRequest) {
  const isPrivatePath = request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/portal") || request.nextUrl.pathname.startsWith("/account");
  if (!isSupabaseConfigured()) {
    const unconfiguredResponse = NextResponse.next({ request });
    if (isPrivatePath) unconfiguredResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
    return unconfiguredResponse;
  }

  const { url, publishableKey } = getSupabasePublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(cacheHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  await supabase.auth.getClaims();
  if (isPrivatePath) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.append("Vary", "Cookie");
  }
  return response;
}
