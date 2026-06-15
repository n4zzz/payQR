import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { BackButton } from "@/components/BackButton";
import { PageShell } from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { MUTED } from "@/lib/tokens";

export default async function LoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <PageShell>
      <BackButton href="/" />
      <h1 style={{ fontSize: 24, margin: "8px 0 4px" }}>Welcome to PayQR</h1>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 18px" }}>Sign in to manage your wallet and sessions.</p>
      <AuthForm />
    </PageShell>
  );
}
