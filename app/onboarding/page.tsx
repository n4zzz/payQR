import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { OnboardingForm } from "@/components/OnboardingForm";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { MUTED } from "@/lib/tokens";

export default async function OnboardingPage() {
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

  const initialUsername = profile && !profile.username.startsWith("user_") ? profile.username : "";
  const initialName = profile?.display_name ?? "";

  return (
    <PageShell>
      <BackButton href="/dashboard" />
      <h1 style={{ fontSize: 24, margin: "8px 0 4px" }}>Claim your page</h1>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 18px" }}>Pick the link people will use to pay you.</p>
      <OnboardingForm initialUsername={initialUsername} initialName={initialName} />
    </PageShell>
  );
}
