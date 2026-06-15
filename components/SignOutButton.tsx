"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MUTED } from "@/lib/tokens";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        setLoading(true);
        await createClient().auth.signOut();
        window.location.href = "/login";
      }}
      disabled={loading}
      style={{ all: "unset", cursor: "pointer", fontSize: 13, color: MUTED, textDecoration: "underline" }}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
