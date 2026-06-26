import { PageShell } from "@/components/PageShell";
import { MUTED } from "@/lib/tokens";

export default function Loading() {
  return (
    <PageShell>
      <div style={{ padding: "40px 0", textAlign: "center", color: MUTED }}>
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid #ece6da",
            borderTopColor: "#0E6B5C",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        Loading…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageShell>
  );
}
