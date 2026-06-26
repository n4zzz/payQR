import { NextResponse, type NextRequest } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";
import { updateSession } from "@/lib/supabase/middleware";

function getIp(request: NextRequest): string {
  // Vercel forwards the client IP in x-forwarded-for.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.ip ?? "unknown";
}

export async function middleware(request: NextRequest) {
  // Baseline abuse protection. Resets on cold starts; upgrade to Redis for scale.
  if (isRateLimited(getIp(request), request.nextUrl.pathname)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*))"],
};
