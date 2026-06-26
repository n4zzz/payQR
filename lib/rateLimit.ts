// Simple in-memory rate limiter for Next.js middleware.
// NOTE: This resets on serverless cold starts. For production scale, replace
// with a Redis-backed limiter (e.g. Upstash).

type Bucket = { tokens: number; lastRefill: number };

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

function getLimit(pathname: string): number {
  if (pathname.startsWith("/login") || pathname.startsWith("/auth/callback")) return 10;
  if (
    pathname.startsWith("/dashboard/wallet") ||
    pathname.startsWith("/dashboard/sessions/new") ||
    pathname.startsWith("/onboarding")
  ) {
    return 30;
  }
  return 100;
}

function getKey(ip: string, pathname: string): string {
  // Bucket by IP + route category so one endpoint can't drain the whole budget.
  let category = "default";
  if (pathname.startsWith("/login") || pathname.startsWith("/auth/callback")) category = "auth";
  else if (pathname.startsWith("/dashboard/wallet")) category = "wallet";
  else if (pathname.startsWith("/dashboard/sessions/new")) category = "new-session";
  else if (pathname.startsWith("/onboarding")) category = "onboarding";
  return `${ip}:${category}`;
}

export function isRateLimited(ip: string, pathname: string): boolean {
  const limit = getLimit(pathname);
  const key = getKey(ip, pathname);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { tokens: limit - 1, lastRefill: now });
    return false;
  }

  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor((elapsed / WINDOW_MS) * limit);
  bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd);
  bucket.lastRefill = tokensToAdd > 0 ? now : bucket.lastRefill;

  if (bucket.tokens < 1) return true;
  bucket.tokens -= 1;
  return false;
}

// Best-effort cleanup to prevent unbounded memory growth.
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key);
  }
}, WINDOW_MS);
