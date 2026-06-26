import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { PageShell } from "@/components/PageShell";
import { SplitView } from "@/components/SplitView";
import { getSession } from "@/lib/queries";
import { CORAL, MUTED, mono } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSession(slug);
  if (!s) return { title: "Not found" };
  return {
    title: `${s.title} — pay ${s.hostName}`,
    description: `Your share of "${s.title}". Pay ${s.hostName} back by scanning.`,
  };
}

export default async function SessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSession(slug);
  if (!s) notFound();

  // Everyone opening a session link must sign in with their own account.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/s/${slug}`)}`);

  // Must claim a username before viewing a split.
  const { data: me } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.username.startsWith("user_")) {
    redirect(`/onboarding?next=${encodeURIComponent(`/s/${slug}`)}`);
  }

  const isHost = !!s.hostId && user.id === s.hostId;

  return (
    <PageShell>
      <BackButton href={`/${me.username}`} label="My wallet" />
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
        <span style={{ fontFamily: mono, color: CORAL, fontSize: 13 }}>÷</span>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em" }}>{s.title}</h1>
      </div>
      <p style={{ color: MUTED, fontSize: 14, margin: "4px 0 18px 26px", lineHeight: 1.5 }}>
        {s.hostName} paid the bill. Here&apos;s your share — pay them back.
      </p>

      <SplitView session={s} isHost={isHost} />

      {isHost && <DeleteSessionButton slug={s.slug} />}
    </PageShell>
  );
}
