import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PageShell } from "@/components/PageShell";
import { WalletManager } from "@/components/WalletManager";
import { SITE_HOST } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { MUTED, TEAL } from "@/lib/tokens";

export default async function WalletDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.username.startsWith("user_")) redirect("/onboarding");

  const { data: rows } = await supabase
    .from("payment_methods")
    .select("id, provider, label, hint, qr_image_path")
    .eq("profile_id", user.id)
    .order("sort_order", { ascending: true });

  const initial = (rows ?? []).map((r) => ({
    id: r.id,
    provider: r.provider,
    label: r.label,
    hint: r.hint,
    qrPath: r.qr_image_path,
  }));

  return (
    <PageShell>
      <BackButton href="/dashboard" />
      <h1 style={{ fontSize: 24, margin: "8px 0 4px" }}>My wallet</h1>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 18px", lineHeight: 1.5 }}>
        Upload the QR images from your banking / e-wallet apps. They show on your page at{" "}
        <Link href={`/${profile.username}`} style={{ color: TEAL, textDecoration: "none" }}>
          {SITE_HOST}/{profile.username}
        </Link>
        .
      </p>
      <WalletManager userId={user.id} initial={initial} />
    </PageShell>
  );
}
