"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { round2, taxFactor } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, tooLong } from "@/lib/validators";
import type { Item, SessionDraft, ShareState } from "@/lib/types";

function makeSlug(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 7; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

type ShareRow = { name: string; amount: number; state: ShareState; items: Item[] | null };

function cleanItems(items: Item[] | undefined): Item[] {
  return (items ?? [])
    .map((it) => ({ name: (it.name ?? "").trim(), price: round2(Number(it.price) || 0) }))
    .filter((it) => it.name !== "" || it.price > 0);
}

// Persists a session + its shares for the signed-in host. Recomputes all amounts
// server-side (never trusts client totals). Returns the slug.
export async function createSession(draft: SessionDraft): Promise<{ slug: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const titleErr = tooLong(draft.title.trim(), LIMITS.sessionTitle);
  if (titleErr || draft.title.trim() === "") throw new Error("Invalid session title.");
  const hostErr = tooLong(draft.hostName.trim(), LIMITS.shareName);
  if (hostErr) throw new Error("Invalid host name.");

  const factor = taxFactor(draft.servicePct, draft.sstPct);
  let subtotal = 0;
  let total = 0;
  let headcount = 0;
  let rows: ShareRow[] = [];

  if (draft.mode === "itemized") {
    const friends = (draft.people ?? [])
      .map((p) => {
        const nameErr = tooLong(p.name.trim(), LIMITS.shareName);
        if (nameErr) throw new Error(`Name too long: ${p.name.trim().slice(0, 20)}...`);
        const items = cleanItems(p.items).map((it) => {
          const itemErr = tooLong(it.name, LIMITS.itemName);
          if (itemErr) throw new Error(`Item name too long: ${it.name.slice(0, 20)}...`);
          return it;
        });
        return { name: p.name.trim(), items };
      })
      .filter((p) => p.name !== "");
    if (friends.length === 0) throw new Error("Add at least one person with their order.");

    subtotal = round2(friends.reduce((s, p) => s + p.items.reduce((a, it) => a + it.price, 0), 0));
    total = round2(subtotal * factor);
    headcount = friends.length + 1;
    rows = [
      { name: draft.hostName, amount: 0, state: "host", items: null },
      ...friends.map((p) => {
        const sub = p.items.reduce((a, it) => a + it.price, 0);
        return { name: p.name, amount: round2(sub * factor), state: "unpaid" as ShareState, items: p.items };
      }),
    ];
  } else {
    subtotal = round2(Number(draft.subtotal) || 0);
    total = round2(subtotal * factor);
    const names = (draft.names ?? [])
      .map((n) => {
        const err = tooLong(n.trim(), LIMITS.shareName);
        if (err) throw new Error(`Name too long: ${n.trim().slice(0, 20)}...`);
        return n.trim();
      })
      .filter(Boolean);
    headcount = names.length + 1;
    const per = round2(total / headcount);
    rows = [
      { name: draft.hostName, amount: round2(total - per * names.length), state: "host", items: null },
      ...names.map((n) => ({ name: n, amount: per, state: "unpaid" as ShareState, items: null })),
    ];
  }

  const slug = makeSlug();
  const { data: session, error } = await supabase
    .from("split_sessions")
    .insert({
      host_id: user.id,
      title: draft.title,
      subtotal,
      service_pct: draft.servicePct,
      sst_pct: draft.sstPct,
      total,
      headcount,
      share_slug: slug,
      split_mode: draft.mode,
    })
    .select("id")
    .single();
  if (error || !session) throw new Error(error?.message ?? "Failed to create session");

  const shareRows = rows.map((r) => ({
    session_id: session.id,
    name: r.name,
    amount: r.amount,
    state: r.state,
    items: r.items,
  }));
  const { error: sharesError } = await supabase.from("split_shares").insert(shareRows);
  if (sharesError) throw new Error(sharesError.message);

  return { slug };
}

// Deletes a session (and its shares, via ON DELETE CASCADE). Host-only — RLS
// plus the host_id filter ensure no one can delete someone else's session.
export async function deleteSession(slug: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("split_sessions")
    .delete()
    .eq("share_slug", slug)
    .eq("host_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/sessions");
  redirect("/dashboard/sessions");
}
