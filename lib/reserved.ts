// Mirror of the reserved_usernames table — used for instant client-side feedback.
export const RESERVED_USERNAMES = new Set([
  "dashboard", "login", "logout", "signup", "onboarding", "settings",
  "api", "s", "about", "help", "admin", "app", "www", "payqr",
]);

// Returns an error message, or null if the username is valid.
export function validateUsername(u: string): string | null {
  if (!/^[a-z0-9_]{3,30}$/.test(u)) {
    return "3–30 chars: lowercase letters, numbers, underscore only.";
  }
  if (RESERVED_USERNAMES.has(u)) return "That username is reserved.";
  return null;
}
