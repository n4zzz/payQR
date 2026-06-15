import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { NewSessionForm } from "@/components/NewSessionForm";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { INK, MUTED } from "@/lib/tokens";

export default async function NewSession() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const hostName = profile?.display_name ?? "You";

  return (
    <PageShell>
      <BackButton href="/dashboard/sessions" />
      <h1 style={{ fontSize: 24, margin: "8px 0 4px", color: INK }}>New session</h1>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 18px", lineHeight: 1.5 }}>
        Enter the bill and who&apos;s splitting. Everyone splits evenly — your share is covered.
      </p>
      <NewSessionForm hostName={hostName} />
    </PageShell>
  );
}
