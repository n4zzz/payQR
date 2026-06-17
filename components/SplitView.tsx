"use client";

import { useMemo, useState } from "react";
import { Wallet } from "@/components/Wallet";
import { computeTotals, perHead, RM } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { CORAL, INK, MUTED, TEAL, mono } from "@/lib/tokens";
import type { SessionView, Share, ShareState } from "@/lib/types";

const STATE_CFG: Record<
  Exclude<ShareState, "host">,
  { bg: string; bd: string; dot: string; mark: string; tag: string; tagC: string }
> = {
  unpaid: { bg: "#FBF9F3", bd: "#ece6da", dot: "transparent", mark: "", tag: "not paid yet", tagC: MUTED },
  claimed: { bg: "#FDF7EE", bd: "#F0D9AE", dot: "#E8A83C", mark: "…", tag: "says paid", tagC: "#B07A12" },
  confirmed: { bg: "#EAF5F1", bd: "#BFE3D7", dot: TEAL, mark: "✓", tag: "confirmed", tagC: TEAL },
};

export function SplitView({ session, isHost }: { session: SessionView; isHost: boolean }) {
  const [shares, setShares] = useState<Share[]>(session.shares);
  const [error, setError] = useState<string | null>(null);
  const itemized = session.mode === "itemized";

  const { service, sst } = useMemo(
    () => computeTotals(session.subtotal, session.servicePct, session.sstPct),
    [session]
  );
  const per = perHead(session.total, shares.length);

  const payers = shares.filter((s) => s.state !== "host");
  const confirmedCount = payers.filter((s) => s.state === "confirmed").length;
  const collected = payers.filter((s) => s.state === "confirmed").reduce((sum, s) => sum + s.amount, 0);

  function setShareState(i: number, state: ShareState) {
    setShares((rows) => rows.map((s, j) => (j === i ? { ...s, state } : s)));
  }

  async function toggleClaim(i: number) {
    const share = shares[i];
    if (share.state === "host" || share.state === "confirmed") return;
    const prev = share.state;
    const next: ShareState = prev === "unpaid" ? "claimed" : "unpaid";
    setShareState(i, next);
    setError(null);
    if (!share.id) return;
    const { error } = await createClient().rpc(next === "claimed" ? "claim_share" : "unclaim_share", {
      p_share_id: share.id,
    });
    if (error) {
      setShareState(i, prev);
      setError("Couldn't update — check your connection and try again.");
    }
  }

  async function confirm(i: number) {
    const share = shares[i];
    if (!share.id || share.state === "host" || share.state === "confirmed") return;
    const prev = share.state;
    setShareState(i, "confirmed");
    setError(null);
    const { error } = await createClient().rpc("confirm_share", { p_share_id: share.id });
    if (error) {
      setShareState(i, prev);
      setError("Couldn't confirm — try again.");
    }
  }

  return (
    <>
      {/* wallet on top — pick a method, scan or save */}
      <Wallet methods={session.methods} amount={itemized ? undefined : per} />

      {/* breakdown */}
      {itemized ? (
        <div style={{ ...boxStyle, color: MUTED, fontFamily: "inherit" }}>
          Everyone pays for what they ordered, plus <b style={{ color: INK }}>{session.servicePct}%</b> service +{" "}
          <b style={{ color: INK }}>{session.sstPct}%</b> SST. <b style={{ color: TEAL }}>{RM(session.total)}</b> to
          collect in total.
        </div>
      ) : (
        <div style={{ ...boxStyle, fontFamily: mono, fontSize: 13 }}>
          <Row k="Subtotal" v={RM(session.subtotal)} />
          <Row k={`Service charge ${session.servicePct}%`} v={RM(service)} />
          <Row k={`SST ${session.sstPct}% (on subtotal + service)`} v={RM(sst)} />
          <div style={{ borderTop: "1px dashed #ddd6c8", margin: "8px 0" }} />
          <Row k="Total" v={RM(session.total)} bold />
          <Row k={`Split ${shares.length} ways`} v={`${RM(per)} each`} accent />
        </div>
      )}

      {/* roster */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "22px 0 10px" }}>
        <h3 style={{ fontSize: 14, margin: 0, color: INK }}>Who&apos;s paid</h3>
        <span style={{ fontSize: 12, color: MUTED, fontFamily: mono }}>
          {confirmedCount}/{payers.length} · {RM(collected)} in
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shares.map((p, i) => {
          if (p.state === "host") {
            return (
              <div key={i} style={{ ...rowStyle, background: "#F2EFE7", border: "1px solid #e6e0d3" }}>
                <span style={dot("#1A1A17", "#1A1A17", "#fff")}>★</span>
                <span style={{ fontWeight: 600 }}>
                  {p.name} <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>· host</span>
                </span>
                <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13, color: MUTED }}>covered</span>
              </div>
            );
          }

          const cfg = STATE_CFG[p.state];
          const dotBd = cfg.dot === "transparent" ? "#cfc8b9" : cfg.dot;

          // ----- itemized: a card with the person's order -----
          if (itemized) {
            return (
              <div key={i} style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: 8, background: cfg.bg, border: `1px solid ${cfg.bd}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={dot(cfg.dot, dotBd, "#fff")}>{cfg.mark}</span>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: cfg.tagC, marginLeft: 6 }}>{cfg.tag}</span>
                  <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 14, fontWeight: 600, color: cfg.tagC }}>
                    {RM(p.amount)}
                  </span>
                </div>

                {p.items && p.items.length > 0 && (
                  <div style={{ paddingLeft: 36, display: "flex", flexDirection: "column", gap: 2 }}>
                    {p.items.map((it, k) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, fontFamily: mono }}>
                        <span>{it.name || "item"}</span>
                        <span>{RM(it.price)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ paddingLeft: 36 }}>{actionButton(p.state, i, isHost, toggleClaim, confirm)}</div>
              </div>
            );
          }

          // ----- equal: host gets a Confirm button, friends tap the row -----
          if (isHost) {
            return (
              <div key={i} style={{ ...rowStyle, background: cfg.bg, border: `1px solid ${cfg.bd}` }}>
                <span style={dot(cfg.dot, dotBd, "#fff")}>{cfg.mark}</span>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: cfg.tagC, marginLeft: 8 }}>{cfg.tag}</span>
                <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 14, color: cfg.tagC }}>{RM(p.amount)}</span>
                {p.state !== "confirmed" && (
                  <button onClick={() => confirm(i)} style={confirmBtn}>
                    Confirm
                  </button>
                )}
              </div>
            );
          }

          const locked = p.state === "confirmed";
          return (
            <button
              key={i}
              onClick={() => toggleClaim(i)}
              disabled={locked}
              style={{ all: "unset", cursor: locked ? "default" : "pointer", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.bd}` }}
            >
              <span style={dot(cfg.dot, dotBd, "#fff")}>{cfg.mark}</span>
              <span style={{ fontWeight: 500 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: cfg.tagC, marginLeft: 8 }}>
                {p.state === "unpaid" ? "tap if you've paid" : cfg.tag}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 14, color: cfg.tagC }}>{RM(p.amount)}</span>
            </button>
          );
        })}
      </div>

      {error && <p style={{ color: CORAL, fontSize: 13, marginTop: 12 }}>{error}</p>}

      <p style={{ fontSize: 11, color: MUTED, marginTop: 18, lineHeight: 1.6 }}>
        {isHost ? (
          <>Tap <b>Confirm</b> once the money lands. PayQR can&apos;t see real transactions, so you confirm.</>
        ) : (
          <>
            Paid? Tap your name / “I’ve paid”. {session.hostName} confirms once it arrives.{" "}
            <span style={{ color: CORAL }}>Check the name in your banking app before paying.</span>
          </>
        )}
      </p>
    </>
  );
}

function actionButton(
  state: ShareState,
  i: number,
  isHost: boolean,
  toggleClaim: (i: number) => void,
  confirm: (i: number) => void
) {
  if (state === "confirmed") {
    return <span style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>✓ confirmed</span>;
  }
  if (isHost) {
    return (
      <button onClick={() => confirm(i)} style={confirmBtn}>
        Confirm
      </button>
    );
  }
  return (
    <button onClick={() => toggleClaim(i)} style={{ ...confirmBtn, background: state === "claimed" ? "#B07A12" : TEAL }}>
      {state === "claimed" ? "Paid ✓ · undo" : "I've paid"}
    </button>
  );
}

function Row({ k, v, bold, accent }: { k: string; v: string; bold?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: accent ? TEAL : INK, fontWeight: bold || accent ? 600 : 400 }}>
      <span style={{ color: bold || accent ? undefined : MUTED }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

function dot(bg: string, bd: string, color: string): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 8,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    background: bg,
    border: `1.5px solid ${bd}`,
    color,
  };
}

const boxStyle: React.CSSProperties = {
  background: "#FBF9F3",
  borderRadius: 16,
  padding: "14px 16px",
  margin: "26px 0 0",
  border: "1px solid #ece6da",
  fontSize: 13,
  lineHeight: 1.5,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 12,
};

const confirmBtn: React.CSSProperties = {
  all: "unset",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  color: "#fff",
  background: TEAL,
  borderRadius: 999,
  padding: "6px 14px",
};
