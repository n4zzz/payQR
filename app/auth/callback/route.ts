import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Completes the OAuth (Google) sign-in: exchanges the code for a session,
// which sets the auth cookies, then sends the user into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  // Only allow relative paths back into the app (no open redirects).
  const next = rawNext && rawNext.startsWith("/") ? rawNext : "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
