import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { PageShell } from "@/components/PageShell";
import { safeNext } from "@/lib/safeNext";
import { createClient } from "@/lib/supabase/server";
import { MUTED } from "@/lib/tokens";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNext(searchParams.next, "/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  const isSession = next.startsWith("/s/");

  return (
    <PageShell>
      <h1 style={{ fontSize: 24, margin: "8px 0 4px" }}>Welcome to payQR</h1>
      <p style={{ color: MUTED, fontSize: 14, margin: "0 0 18px" }}>
        {isSession ? "Sign in to open this split and settle your share." : "Sign in to manage your wallet and sessions."}
      </p>
      <AuthForm next={next} />
    </PageShell>
  );
}
