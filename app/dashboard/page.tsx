import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkTile } from "@/components/LinkTile";
import { PageShell } from "@/components/PageShell";
import { SignOutButton } from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { MUTED, TEAL, mono } from "@/lib/tokens";

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.username.startsWith("user_")) redirect("/onboarding");

  return (
    <PageShell>
      <h1 style={{ fontSize: 24, margin: "8px 0 2px" }}>Dashboard</h1>
      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 2px" }}>{user.email}</p>
      <p style={{ fontFamily: mono, fontSize: 13, margin: "0 0 20px" }}>
        <Link href={`/${profile.username}`} style={{ color: TEAL, textDecoration: "none" }}>
          payqr.my/{profile.username}
        </Link>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <LinkTile href="/dashboard/wallet" title="My wallet" sub="Add and reorder your QR methods" />
        <LinkTile href="/dashboard/sessions" title="Sessions" sub="Create a bill split, track who's paid" />
        <LinkTile href={`/${profile.username}`} title="View my page" sub={`payqr.my/${profile.username}`} />
      </div>

      <div style={{ marginTop: 22 }}>
        <SignOutButton />
      </div>
    </PageShell>
  );
}
