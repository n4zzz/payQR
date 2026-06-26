import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const AUTH_COOKIE = "sb-access-token";
const REFRESH_COOKIE = "sb-refresh-token";

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.has(AUTH_COOKIE) || request.cookies.has(REFRESH_COOKIE);
}

// Refreshes the Supabase auth session when the user has auth cookies.
// Public pages skip the Supabase round-trip for anonymous visitors.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No auth cookies -> no session to refresh. This avoids a slow Supabase
  // round-trip on every anonymous page view.
  if (!hasSessionCookie(request)) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getSession reads from cookies locally; getUser hits the Supabase server.
  // For middleware refresh purposes, getSession is enough and much faster.
  await supabase.auth.getSession();

  return response;
}
