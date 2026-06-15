import Link from "next/link";
import { INK, MUTED, PAPER, TEAL, mono, sans } from "@/lib/tokens";

export function PageShell({
  children,
  maxWidth = 440,
  action,
  bottomBar,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  action?: React.ReactNode;
  bottomBar?: React.ReactNode;
}) {
  return (
    <div style={{ fontFamily: sans, background: PAPER, minHeight: "100vh", color: INK }}>
      <div style={{ maxWidth, margin: "0 auto", padding: bottomBar ? "0 18px 120px" : "0 18px 90px" }}>
        <header style={{ padding: "18px 2px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: INK }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: TEAL,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              P
            </div>
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {action ?? <span style={{ fontSize: 12, color: MUTED, fontFamily: mono }}>beta</span>}
          </div>
        </header>
        {children}
      </div>

      {bottomBar && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(246,243,236,.92)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid #e6e0d3",
            padding: "12px 0 16px",
          }}
        >
          <div style={{ maxWidth, margin: "0 auto", padding: "0 18px" }}>{bottomBar}</div>
        </div>
      )}
    </div>
  );
}
