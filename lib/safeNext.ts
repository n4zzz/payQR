// Validate a ?next= redirect parameter to prevent open redirects.
// Only relative paths within the app are allowed.
export function safeNext(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    const u = new URL(raw, "http://localhost");
    // Reject anything with a host/protocol (e.g. //evil.com, https://evil.com)
    if (u.hostname !== "localhost" || u.protocol !== "http:") return fallback;
    // Reject newline/carriage-return injection
    if (/[\r\n]/.test(raw)) return fallback;
    return u.pathname + u.search + u.hash || fallback;
  } catch {
    return fallback;
  }
}
