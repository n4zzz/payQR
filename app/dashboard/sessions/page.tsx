import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { LinkTile } from "@/components/LinkTile";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { MUTED } from "@/lib/tokens";

export default async function SessionsDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <PageShell>
      <BackButton href="/dashboard" />
      <h1 style={{ fontSize: 24, margin: "8px 0 8px" }}>Sessions</h1>
      <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
        Your bill-split sessions. Create one, share the link, and confirm payers as the money lands.
      </p>
      <LinkTile href="/dashboard/sessions/new" title="+ New session" sub="enter the bill, add names, get a link" />
    </PageShell>
  );
}
