"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CORAL, MUTED, TEAL } from "@/lib/tokens";
import { fieldLabel, primaryBtn, textInput } from "@/lib/uiStyles";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }
      // Email confirmation is on — no session yet.
      setNotice("Check your email to confirm your account, then sign in.");
      setMode("in");
      setLoading(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "block" }}>
        <div style={fieldLabel}>Email</div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={textInput}
          autoComplete="email"
        />
      </label>
      <label style={{ display: "block" }}>
        <div style={fieldLabel}>Password</div>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={textInput}
          autoComplete={mode === "up" ? "new-password" : "current-password"}
        />
      </label>

      {error && <p style={{ color: CORAL, fontSize: 13, margin: 0 }}>{error}</p>}
      {notice && <p style={{ color: TEAL, fontSize: 13, margin: 0 }}>{notice}</p>}

      <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
        {loading ? "…" : mode === "in" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "in" ? "up" : "in"));
          setError(null);
          setNotice(null);
        }}
        style={{ all: "unset", cursor: "pointer", textAlign: "center", fontSize: 13, color: MUTED }}
      >
        {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
      </button>
    </form>
  );
}
