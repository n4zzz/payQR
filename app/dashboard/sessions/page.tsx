import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { LinkTile } from "@/components/LinkTile";
import { PageShell } from "@/components/PageShell";
import { RM } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { INK, MUTED, TEAL, mono } from "@/lib/tokens";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

export default async function SessionsDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("split_sessions")
    .select("id, title, total, share_slug, status, created_at")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (sessions ?? []).map((s) => s.id);
  const { data: shares } = ids.length
    ? await supabase.from("split_shares").select("session_id, amount, state").in("session_id", ids)
    : { data: [] as { session_id: string; amount: number; state: string }[] };

  // Aggregate payer progress per session (host share excluded).
  const agg = new Map<string, { toCollect: number; collected: number; payers: number; confirmed: number }>();
  for (const sh of shares ?? []) {
    if (sh.state === "host") continue;
    const a = agg.get(sh.session_id) ?? { toCollect: 0, collected: 0, payers: 0, confirmed: 0 };
    a.toCollect += Number(sh.amount);
    a.payers += 1;
    if (sh.state === "confirmed") {
      a.collected += Number(sh.amount);
      a.confirmed += 1;
    }
    agg.set(sh.session_id, a);
  }

  return (
    <PageShell>
      <BackButton href="/dashboard" />
      <h1 style={{ fontSize: 24, margin: "8px 0 4px" }}>Sessions</h1>
      <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
        Your bill splits. Open one to share the link and confirm payers as the money lands.
      </p>

      <div style={{ marginBottom: 16 }}>
        <LinkTile href="/dashboard/sessions/new" title="+ New session" sub="enter the bill, add names, get a link" />
      </div>

      {(sessions ?? []).length === 0 ? (
        <p style={{ color: MUTED, fontSize: 14 }}>No sessions yet. Create your first above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(sessions ?? []).map((s) => {
            const a = agg.get(s.id) ?? { toCollect: 0, collected: 0, payers: 0, confirmed: 0 };
            const pct = a.toCollect > 0 ? Math.round((a.collected / a.toCollect) * 100) : 0;
            const done = a.payers > 0 && a.confirmed === a.payers;
            return (
              <Link
                key={s.id}
                href={`/s/${s.share_slug}`}
                style={{
                  textDecoration: "none",
                  color: INK,
                  background: "#fff",
                  border: "1px solid #ece6da",
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "block",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{s.title}</span>
                  <span style={{ fontSize: 11, color: MUTED, fontFamily: mono }}>{fmtDate(s.created_at)}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontWeight: 600,
                      color: done ? TEAL : "#B07A12",
                      background: done ? "#EAF5F1" : "#FDF7EE",
                      borderRadius: 999,
                      padding: "3px 8px",
                    }}
                  >
                    {done ? "settled" : `${a.confirmed}/${a.payers} paid`}
                  </span>
                </div>

                {/* progress bar */}
                <div style={{ height: 6, background: "#F0ECE2", borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: TEAL, borderRadius: 999 }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: mono, fontSize: 12, color: MUTED }}>
                  <span>
                    <span style={{ color: TEAL, fontWeight: 600 }}>{RM(a.collected)}</span> of {RM(a.toCollect)} in
                  </span>
                  <span>{`/s/${s.share_slug}`}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
