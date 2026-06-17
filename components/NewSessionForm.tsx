"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createSession } from "@/app/dashboard/sessions/actions";
import { computeTotals, round2, RM, taxFactor } from "@/lib/money";
import { CORAL, INK, MUTED, TEAL, mono } from "@/lib/tokens";
import { fieldLabel, primaryBtn, secondaryBtn, textInput } from "@/lib/uiStyles";
import type { Item, SessionDraft, SessionMode } from "@/lib/types";

type Person = { name: string; items: Item[] };

export function NewSessionForm({ hostName }: { hostName: string }) {
  const [mode, setMode] = useState<SessionMode>("equal");
  const [title, setTitle] = useState("Mamak — Tuesday");
  const [servicePct, setServicePct] = useState(10);
  const [sstPct, setSstPct] = useState(6);

  // equal mode
  const [subtotal, setSubtotal] = useState(80);
  const [names, setNames] = useState<string[]>(["Aina", "Faiz", "Su", "Ben"]);
  const [newName, setNewName] = useState("");

  // itemized mode
  const [people, setPeople] = useState<Person[]>([{ name: "Aina", items: [{ name: "", price: 0 }] }]);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const factor = taxFactor(servicePct, sstPct);

  // equal computed
  const { service, sst, total } = computeTotals(subtotal, servicePct, sstPct);
  const eqHeadcount = names.length + 1;
  const eqPer = eqHeadcount > 0 ? round2(total / eqHeadcount) : 0;

  // itemized computed
  const personSub = (p: Person) => p.items.reduce((s, it) => s + (Number(it.price) || 0), 0);
  const personAmount = (p: Person) => round2(personSub(p) * factor);
  const itTotal = round2(people.reduce((s, p) => s + personAmount(p), 0));

  function create() {
    setError(null);
    if (mode === "itemized" && !people.some((p) => p.name.trim() && personSub(p) > 0)) {
      setError("Add at least one person with an order.");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const draft: SessionDraft = { title, mode, servicePct, sstPct, hostName, subtotal, names, people };
    startTransition(async () => {
      try {
        const { slug } = await createSession(draft);
        setShareUrl(`${origin}/s/${slug}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create session.");
      }
    });
  }

  if (shareUrl) return <SharePanel url={shareUrl} title={title} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={{ display: "block" }}>
        <div style={fieldLabel}>What&apos;s this for?</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={textInput} />
      </label>

      {/* mode switch */}
      <div style={{ display: "flex", gap: 4, background: "#F2EFE7", borderRadius: 12, padding: 4 }}>
        {(["equal", "itemized"] as SessionMode[]).map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                all: "unset",
                flex: 1,
                textAlign: "center",
                cursor: "pointer",
                padding: "9px 0",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
                color: on ? "#fff" : MUTED,
                background: on ? TEAL : "transparent",
              }}
            >
              {m === "equal" ? "Split equally" : "By order"}
            </button>
          );
        })}
      </div>

      {/* service + SST (both modes) */}
      <div style={{ display: "flex", gap: 10 }}>
        <label style={{ flex: 1 }}>
          <div style={fieldLabel}>Service %</div>
          <input type="number" value={servicePct} onChange={(e) => setServicePct(Number(e.target.value) || 0)} style={{ ...textInput, fontFamily: mono }} />
        </label>
        <label style={{ flex: 1 }}>
          <div style={fieldLabel}>SST %</div>
          <input type="number" value={sstPct} onChange={(e) => setSstPct(Number(e.target.value) || 0)} style={{ ...textInput, fontFamily: mono }} />
        </label>
      </div>

      {mode === "equal" ? (
        <>
          <label style={{ display: "block" }}>
            <div style={fieldLabel}>Subtotal RM (before service + SST)</div>
            <input type="number" value={subtotal} onChange={(e) => setSubtotal(Number(e.target.value) || 0)} style={{ ...textInput, fontFamily: mono }} />
          </label>

          <div style={breakdownBox}>
            <BRow k="Subtotal" v={RM(subtotal)} />
            <BRow k={`Service charge ${servicePct}%`} v={RM(service)} />
            <BRow k={`SST ${sstPct}% (on subtotal + service)`} v={RM(sst)} />
            <div style={{ borderTop: "1px dashed #ddd6c8", margin: "8px 0" }} />
            <BRow k="Total" v={RM(total)} bold />
            <BRow k={`Split ${eqHeadcount} ways (incl. you)`} v={`${RM(eqPer)} each`} accent />
          </div>

          <div>
            <div style={fieldLabel}>Who&apos;s splitting?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={personRow}>
                <span style={{ fontWeight: 600 }}>
                  {hostName} <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>· you (covered)</span>
                </span>
                <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13, color: MUTED }}>{RM(eqPer)}</span>
              </div>
              {names.map((n, i) => (
                <div key={i} style={personRow}>
                  <span style={{ fontWeight: 500 }}>{n}</span>
                  <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13, color: INK }}>{RM(eqPer)}</span>
                  <button onClick={() => setNames((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${n}`} style={removeX}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input
              value={newName}
              placeholder="Add a name + Enter"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const n = newName.trim();
                  if (n) {
                    setNames((p) => [...p, n]);
                    setNewName("");
                  }
                }
              }}
              style={{ ...textInput, marginTop: 8 }}
            />
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>
            Add who owes you and what they ordered. Each pays for their items + {servicePct}% service + {sstPct}% SST. Your
            own order is covered.
          </p>

          {people.map((p, pi) => (
            <div key={pi} style={{ background: "#fff", border: "1px solid #ece6da", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input
                  value={p.name}
                  placeholder="Name"
                  onChange={(e) => setPeople((ps) => ps.map((x, j) => (j === pi ? { ...x, name: e.target.value } : x)))}
                  style={{ ...textInput, fontWeight: 600 }}
                />
                {people.length > 1 && (
                  <button onClick={() => setPeople((ps) => ps.filter((_, j) => j !== pi))} aria-label="Remove person" style={removeX}>
                    ×
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {p.items.map((it, ii) => (
                  <div key={ii} style={{ display: "flex", gap: 6 }}>
                    <input
                      value={it.name}
                      placeholder="Item (e.g. Nasi lemak)"
                      onChange={(e) =>
                        setPeople((ps) => ps.map((x, j) => (j === pi ? { ...x, items: x.items.map((y, k) => (k === ii ? { ...y, name: e.target.value } : y)) } : x)))
                      }
                      style={{ ...textInput, flex: 1 }}
                    />
                    <input
                      type="number"
                      value={it.price || ""}
                      placeholder="RM"
                      onChange={(e) =>
                        setPeople((ps) => ps.map((x, j) => (j === pi ? { ...x, items: x.items.map((y, k) => (k === ii ? { ...y, price: Number(e.target.value) || 0 } : y)) } : x)))
                      }
                      style={{ ...textInput, width: 84, fontFamily: mono }}
                    />
                    {p.items.length > 1 && (
                      <button
                        onClick={() => setPeople((ps) => ps.map((x, j) => (j === pi ? { ...x, items: x.items.filter((_, k) => k !== ii) } : x)))}
                        aria-label="Remove item"
                        style={removeX}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setPeople((ps) => ps.map((x, j) => (j === pi ? { ...x, items: [...x.items, { name: "", price: 0 }] } : x)))}
                  style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 600, color: TEAL }}
                >
                  + add item
                </button>
                <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13, fontWeight: 600, color: INK }}>
                  {RM(personAmount(p))}
                </span>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setPeople((ps) => [...ps, { name: "", items: [{ name: "", price: 0 }] }])}
            style={{ ...secondaryBtn, textAlign: "center" }}
          >
            + Add person
          </button>

          <div style={breakdownBox}>
            <BRow k={`Total to collect (incl. ${servicePct}% + ${sstPct}%)`} v={RM(itTotal)} accent />
          </div>
        </>
      )}

      {error && <p style={{ color: CORAL, fontSize: 13, margin: 0 }}>{error}</p>}

      <button onClick={create} disabled={pending} style={{ ...primaryBtn, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Creating…" : "Create & get link"}
      </button>
    </div>
  );
}

function SharePanel({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const msg = `Hi! Splitting "${title}" — open to see your share & pay: ${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#EAF5F1", border: "1px solid #BFE3D7", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: TEAL }}>Session created 🎉</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
          Share this link. Friends open it, pay, and tap “I’ve paid”.
        </div>
      </div>

      <div style={{ ...breakdownBox, wordBreak: "break-all", fontSize: 12 }}>{url}</div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={copy} style={{ ...secondaryBtn, flex: 1 }}>
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a href={wa} target="_blank" rel="noreferrer" style={{ ...primaryBtn, flex: 1, textDecoration: "none" }}>
          Share on WhatsApp
        </a>
      </div>

      <Link href={url} style={{ ...secondaryBtn, textAlign: "center", textDecoration: "none" }}>
        Open the session →
      </Link>
    </div>
  );
}

function BRow({ k, v, bold, accent }: { k: string; v: string; bold?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: accent ? TEAL : INK, fontWeight: bold || accent ? 600 : 400 }}>
      <span style={{ color: bold || accent ? undefined : MUTED }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

const breakdownBox: React.CSSProperties = {
  background: "#FBF9F3",
  borderRadius: 16,
  padding: "14px 16px",
  fontFamily: mono,
  fontSize: 13,
  border: "1px solid #ece6da",
};

const personRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "#fff",
  border: "1px solid #ece6da",
  borderRadius: 12,
  padding: "10px 12px",
};

const removeX: React.CSSProperties = { all: "unset", cursor: "pointer", color: MUTED, marginLeft: 10, fontSize: 16 };
