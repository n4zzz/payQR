"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CORAL, INK, MUTED } from "@/lib/tokens";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 35.8 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function AuthForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser navigates away to Google, so we don't reset loading.
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          cursor: "pointer",
          padding: "13px 16px",
          borderRadius: 14,
          background: "#fff",
          border: "1px solid #d9d2c4",
          color: INK,
          fontWeight: 600,
          fontSize: 15,
          fontFamily: "inherit",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <GoogleIcon />
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>

      {error && <p style={{ color: CORAL, fontSize: 13, margin: 0 }}>{error}</p>}

      <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6, textAlign: "center" }}>
        We only use your Google name and email to set up your PayQR page.
      </p>
    </div>
  );
}
