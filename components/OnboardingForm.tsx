"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateUsername } from "@/lib/reserved";
import { SITE_HOST } from "@/lib/site";
import { CORAL, MUTED, mono } from "@/lib/tokens";
import { fieldLabel, primaryBtn, textInput } from "@/lib/uiStyles";

export function OnboardingForm({
  initialUsername,
  initialName,
}: {
  initialUsername: string;
  initialName: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    const invalid = validateUsername(u);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: u, display_name: displayName.trim() || u, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      setError(error.code === "23505" ? "That username is taken." : error.message);
      setLoading(false);
      return;
    }

    router.push(`/${u}`);
    router.refresh();
  }

  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "block" }}>
        <div style={fieldLabel}>Your name</div>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={textInput} placeholder="Amir" />
      </label>

      <label style={{ display: "block" }}>
        <div style={fieldLabel}>Username (your link)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span
            style={{
              fontFamily: mono,
              fontSize: 14,
              color: MUTED,
              background: "#F2EFE7",
              border: "1px solid #ece6da",
              borderRight: "none",
              borderRadius: "12px 0 0 12px",
              padding: "11px 6px 11px 12px",
              whiteSpace: "nowrap",
            }}
          >
            {SITE_HOST}/
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            style={{ ...textInput, borderRadius: "0 12px 12px 0", fontFamily: mono }}
            placeholder="amir"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
      </label>

      {error && <p style={{ color: CORAL, fontSize: 13, margin: 0 }}>{error}</p>}

      <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
        {loading ? "Saving…" : "Claim my page"}
      </button>
    </form>
  );
}
