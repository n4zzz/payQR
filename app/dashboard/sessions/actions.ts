"use server";

import { buildEvenShares, computeTotals } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { SessionDraft } from "@/lib/types";

function makeSlug(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 7; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

// Persists a session + its shares for the signed-in host. Returns the slug.
export async function createSession(draft: SessionDraft): Promise<{ slug: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { total } = computeTotals(draft.subtotal, draft.servicePct, draft.sstPct);
  const { headcount, shares } = buildEvenShares(total, draft.hostName, draft.names);
  const slug = makeSlug();

  const { data: session, error } = await supabase
    .from("split_sessions")
    .insert({
      host_id: user.id,
      title: draft.title,
      subtotal: draft.subtotal,
      service_pct: draft.servicePct,
      sst_pct: draft.sstPct,
      total,
      headcount,
      share_slug: slug,
    })
    .select("id")
    .single();
  if (error || !session) throw new Error(error?.message ?? "Failed to create session");

  const rows = shares.map((s) => ({
    session_id: session.id,
    name: s.name,
    amount: s.amount,
    state: s.state,
  }));
  const { error: sharesError } = await supabase.from("split_shares").insert(rows);
  if (sharesError) throw new Error(sharesError.message);

  return { slug };
}
