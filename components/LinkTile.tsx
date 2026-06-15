import Link from "next/link";
import { CORAL, INK, MUTED, mono } from "@/lib/tokens";

export function LinkTile({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: INK,
        display: "block",
        background: "#fff",
        border: "1px solid #ece6da",
        borderRadius: 16,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
          <div style={{ fontFamily: mono, fontSize: 12, color: MUTED, marginTop: 2 }}>{sub}</div>
        </div>
        <span style={{ marginLeft: "auto", color: CORAL, fontSize: 20 }}>→</span>
      </div>
    </Link>
  );
}
