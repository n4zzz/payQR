// Base URL of the deployed app. Set NEXT_PUBLIC_SITE_URL in Vercel + .env.local.
// Switch this one env var to your custom domain (e.g. https://payqr.my) later.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Host without scheme, for display (e.g. "re-pay-mu.vercel.app").
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
