import { CreateSessionButton } from "@/components/CreateSessionButton";
import { PageShell } from "@/components/PageShell";
import { SettingsButton } from "@/components/SettingsButton";
import { Wallet } from "@/components/Wallet";
import { CORAL, MUTED, mono } from "@/lib/tokens";
import type { ProfilePage } from "@/lib/types";

export function WalletScreen({ profile }: { profile: ProfilePage }) {
  return (
    <PageShell action={<SettingsButton />} bottomBar={<CreateSessionButton />}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
        <span style={{ fontFamily: mono, color: CORAL, fontSize: 13 }}>★</span>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em" }}>Pay {profile.displayName}</h1>
      </div>
      <p style={{ color: MUTED, fontSize: 13, margin: "2px 0 0 26px", fontFamily: mono }}>payqr.my/{profile.username}</p>

      <div style={{ marginTop: 16 }}>
        <Wallet methods={profile.methods} />
      </div>

      <p style={{ fontSize: 11, color: MUTED, marginTop: 26, lineHeight: 1.6, textAlign: "center" }}>
        PayQR only shows QR images {profile.displayName} uploaded — it never holds or moves money. Check the name in your
        banking app before paying.
      </p>
    </PageShell>
  );
}
