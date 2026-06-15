"use client";

import { useState } from "react";
import { FauxQR, downloadQR } from "@/lib/qr";
import { RM } from "@/lib/money";
import { INK, MUTED, mono } from "@/lib/tokens";
import type { Method } from "@/lib/types";

const CARD_W = 320;
const CARD_H = 196;
const EXPANDED_H = 300; // height a card grows to when lifted, to showcase the QR
const PEEK = 62; // how much of each tucked card shows
const HEADER_PEEK = 46; // visible strip of non-selected cards when one is open

function QR({ m, size }: { m: Method; size: number }) {
  if (m.qrUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={m.qrUrl}
        width={size}
        height={size}
        alt="Payment QR code"
        style={{ display: "block", borderRadius: 4 }}
      />
    );
  }
  return <FauxQR seed={m.qrSeed ?? m.id} size={size} />;
}

function saveMethod(m: Method) {
  void downloadQR({ label: m.label, filename: `payqr-${m.id}.png`, seed: m.qrSeed, url: m.qrUrl });
}

function Card({
  m,
  style,
  onClick,
  expanded,
  onQR,
  z,
}: {
  m: Method;
  style: React.CSSProperties;
  onClick: () => void;
  expanded: boolean;
  onQR: () => void;
  z: number;
}) {
  const txt = m.dark ? "#1A1A17" : "#fff";
  const sub = m.dark ? "rgba(26,26,23,.7)" : "rgba(255,255,255,.8)";
  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: "50%",
        width: CARD_W,
        height: CARD_H,
        marginLeft: -CARD_W / 2,
        borderRadius: 20,
        cursor: "pointer",
        zIndex: z,
        background: `linear-gradient(150deg, ${m.grad[0]} 0%, ${m.grad[1]} 100%)`,
        color: txt,
        boxShadow: "0 12px 30px -12px rgba(0,0,0,.5)",
        transition:
          "transform 420ms cubic-bezier(.2,.8,.2,1), height 420ms cubic-bezier(.2,.8,.2,1), box-shadow 300ms",
        padding: 18,
        boxSizing: "border-box",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* subtle sheen */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "rgba(255,255,255,.12)",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 17 }}>{m.label}</div>
          <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>{m.hint}</div>
        </div>
        <div
          style={{
            width: 38,
            height: 26,
            borderRadius: 6,
            background: "rgba(255,255,255,.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color: txt,
          }}
        >
          {m.short}
        </div>
      </div>

      {/* expanded: QR centered, Save button directly beneath it */}
      {expanded && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 56,
            bottom: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onQR();
            }}
            style={{
              background: "#fff",
              padding: 10,
              borderRadius: 14,
              cursor: "zoom-in",
              lineHeight: 0,
              boxShadow: "0 8px 20px -10px rgba(0,0,0,.5)",
            }}
          >
            <QR m={m} size={150} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              saveMethod(m);
            }}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 20px",
              borderRadius: 999,
              background: "rgba(255,255,255,.22)",
              color: txt,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ↓ Save QR
          </button>
        </div>
      )}
    </div>
  );
}

export function Wallet({ methods, amount }: { methods: Method[]; amount?: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState<Method | null>(null);

  if (methods.length === 0) {
    return (
      <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, padding: "20px 0" }}>
        No payment methods yet.
      </p>
    );
  }

  const stackHeight =
    selected === null
      ? (methods.length - 1) * PEEK + CARD_H + 20
      : EXPANDED_H + 14 + (methods.length - 2) * HEADER_PEEK + CARD_H + 20;

  return (
    <>
      <p style={{ color: MUTED, fontSize: 14, margin: "4px 0 18px", lineHeight: 1.5 }}>
        {selected ? "Tap the card to tuck it back." : "Tap a card to lift it and show its QR."}
      </p>

      <div style={{ position: "relative", height: stackHeight, transition: "height 420ms" }}>
        {methods.map((m, i) => {
          const isSel = selected === m.id;
          let style: React.CSSProperties;
          if (selected === null) {
            style = { transform: `translateY(${i * PEEK}px)` };
          } else if (isSel) {
            style = { transform: `translateY(0px)`, height: EXPANDED_H, boxShadow: "0 26px 50px -16px rgba(0,0,0,.55)" };
          } else {
            const order = methods.filter((x) => x.id !== selected).findIndex((x) => x.id === m.id);
            style = { transform: `translateY(${EXPANDED_H + 14 + order * HEADER_PEEK}px) scale(.96)`, opacity: 0.9 };
          }
          const z = isSel ? 100 : selected === null ? i : 10 + i;
          return (
            <Card
              key={m.id}
              m={m}
              style={style}
              z={z}
              expanded={isSel}
              onClick={() => setSelected(isSel ? null : m.id)}
              onQR={() => setZoom(m)}
            />
          );
        })}
      </div>

      {selected && (
        <button
          onClick={() => setSelected(null)}
          style={{
            all: "unset",
            cursor: "pointer",
            display: "block",
            margin: "18px auto 0",
            padding: "10px 20px",
            borderRadius: 999,
            background: "#fff",
            border: "1px solid #ece6da",
            fontSize: 14,
            fontWeight: 600,
            color: INK,
          }}
        >
          Back to all cards
        </button>
      )}

      {/* fullscreen zoom for scanning */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,12,11,.88)",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            padding: 20,
          }}
        >
          <div style={{ background: "#fff", padding: 22, borderRadius: 24 }}>
            <QR m={zoom} size={260} />
          </div>
          <div style={{ color: "#fff", fontFamily: mono }}>
            {zoom.label}
            {amount ? ` · Pay ${RM(amount)}` : ""}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              saveMethod(zoom);
            }}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "12px 26px",
              borderRadius: 999,
              background: "#fff",
              color: INK,
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            ↓ Save QR to photos
          </button>
          <div style={{ color: "rgba(255,255,255,.65)", fontSize: 13, textAlign: "center", lineHeight: 1.6, maxWidth: 300 }}>
            Paying from this phone? Save it, then in your e-wallet tap <b>Scan → Upload from gallery</b>.
            <br />
            Tap anywhere to close.
          </div>
        </div>
      )}
    </>
  );
}
