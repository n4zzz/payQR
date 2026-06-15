"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createSession } from "@/app/dashboard/sessions/actions";
import { computeTotals, RM } from "@/lib/money";
import { CORAL, INK, MUTED, TEAL, mono } from "@/lib/tokens";
import type { SessionDraft } from "@/lib/types";

export function NewSessionForm({ hostName }: { hostName: string }) {
  const [title, setTitle] = useState("Mamak — Tuesday");
  const [subtotal, setSubtotal] = useState(80);
  const [servicePct, setServicePct] = useState(10);
  const [sstPct, setSstPct] = useState(6);
  const [names, setNames] = useState<string[]>(["Aina", "Faiz", "Su", "Ben"]);
  const [newName, setNewName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { service, sst, total } = useMemo(
    () => computeTotals(subtotal, servicePct, sstPct),
    [subtotal, servicePct, sstPct]
  );
  const headcount = names.length + 1;
  const per = headcount > 0 ? Math.round((total / headcount) * 100) / 100 : 0;

  function addName() {
    const n = newName.trim();
    if (!n) return;
    setNames((p) => [...p, n]);
    setNewName("");
  }

  function create() {
    setError(null);
    const draft: SessionDraft = { title, subtotal, servicePct, sstPct, hostName, names };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    startTransition(async () => {
      try {
        const { slug } = await createSession(draft);
        setShareUrl(`${origin}/s/${slug}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create session.");
      }
    });
  }

  if (shareUrl) {
    return <SharePanel url={shareUrl} title={title} per={per} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="What's this for?">
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={textInput} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 10 }}>
        <Field label="Subtotal RM">
          <NumInput value={subtotal} onChange={setSubtotal} />
        </Field>
        <Field label="Service %">
          <NumInput value={servicePct} onChange={setServicePct} />
        </Field>
        <Field label="SST %">
          <NumInput value={sstPct} onChange={setSstPct} />
        </Field>
      </div>

      {/* live breakdown */}
      <div style={breakdownBox}>
        <Row k="Subtotal" v={RM(subtotal)} />
        <Row k={`Service charge ${servicePct}%`} v={RM(service)} />
        <Row k={`SST ${sstPct}% (on subtotal + service)`} v={RM(sst)} />
        <div style={{ borderTop: "1px dashed #ddd6c8", margin: "8px 0" }} />
        <Row k="Total" v={RM(total)} bold />
        <Row k={`Split ${headcount} ways (incl. you)`} v={`${RM(per)} each`} accent />
      </div>

      {/* diners */}
      <div>
        <div style={fieldLabel}>Who&apos;s splitting?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={personRow}>
            <span style={{ fontWeight: 600 }}>
              {hostName} <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>· you (covered)</span>
            </span>
            <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13, color: MUTED }}>{RM(per)}</span>
          </div>
          {names.map((n, i) => (
            <div key={i} style={personRow}>
              <span style={{ fontWeight: 500 }}>{n}</span>
              <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 13, color: INK }}>{RM(per)}</span>
              <button
                onClick={() => setNames((p) => p.filter((_, j) => j !== i))}
                aria-label={`Remove ${n}`}
                style={{ all: "unset", cursor: "pointer", color: MUTED, marginLeft: 10, fontSize: 16 }}
              >
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
              addName();
            }
          }}
          style={{ ...textInput, marginTop: 8 }}
        />
      </div>

      {error && <p style={{ color: CORAL, fontSize: 13 }}>{error}</p>}

      <button onClick={create} disabled={pending} style={{ ...primaryBtn, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Creating…" : "Create & get link"}
      </button>
    </div>
  );
}

function SharePanel({ url, title, per }: { url: string; title: string; per: number }) {
  const [copied, setCopied] = useState(false);
  const msg = `Hi! Splitting "${title}" — your share is ${RM(per)}. Pay me & tap "I've paid" here: ${url}`;
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
      <div style={{ background: "#EAF5F1", border: "1px solid #BFE3D7", borderRadius: 16, padding: "16px 16px" }}>
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

/* ---------- small UI helpers ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={fieldLabel}>{label}</div>
      {children}
    </label>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      style={{ ...textInput, fontFamily: mono }}
    />
  );
}

function Row({ k, v, bold, accent }: { k: string; v: string; bold?: boolean; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 0",
        color: accent ? TEAL : INK,
        fontWeight: bold || accent ? 600 : 400,
      }}
    >
      <span style={{ color: bold || accent ? undefined : MUTED }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  color: MUTED,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: 6,
};

const textInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  border: "1px solid #ece6da",
  borderRadius: 12,
  padding: "11px 12px",
  fontSize: 15,
  color: INK,
  fontFamily: "inherit",
};

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

const primaryBtn: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  cursor: "pointer",
  border: "none",
  padding: "13px 16px",
  borderRadius: 14,
  background: TEAL,
  color: "#fff",
  fontWeight: 600,
  fontSize: 15,
  fontFamily: "inherit",
};

const secondaryBtn: React.CSSProperties = {
  display: "block",
  cursor: "pointer",
  padding: "12px 16px",
  borderRadius: 14,
  background: "#fff",
  border: "1px solid #ece6da",
  color: INK,
  fontWeight: 600,
  fontSize: 14,
  fontFamily: "inherit",
};
