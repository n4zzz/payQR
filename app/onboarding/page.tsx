import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { OnboardingForm } from "@/components/OnboardingForm";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { MUTED } from "@/lib/tokens";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const next = typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "";

  const supabase = await createClient();
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

  const fromSplit = next.startsWith("/s/");

  return (
    <PageShell>
      <BackButton href="/" />
      <h1 style={{ fontSize: 24, margin: "8px 0 4px" }}>Claim your page</h1>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 18px" }}>
        {fromSplit
          ? "Pick your name and link first — then you'll go straight to the split."
          : "Pick the link people will use to pay you."}
      </p>
      <OnboardingForm initialUsername={initialUsername} initialName={initialName} next={next} />
    </PageShell>
  );
}
