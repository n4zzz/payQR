import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PageShell } from "@/components/PageShell";
import { SplitView } from "@/components/SplitView";
import { getSession } from "@/lib/queries";
import { CORAL, MUTED, mono } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const s = await getSession(params.slug);
  if (!s) return { title: "Not found" };
  return {
    title: `${s.title} — pay ${s.hostName}`,
    description: `Your share of "${s.title}". Pay ${s.hostName} back by scanning.`,
  };
}

export default async function SessionPage({ params }: { params: { slug: string } }) {
  const s = await getSession(params.slug);
  if (!s) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isHost = !!user && !!s.hostId && user.id === s.hostId;

  return (
    <PageShell>
      <BackButton href={`/${s.hostUsername}`} label={`Back to ${s.hostName}`} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
        <span style={{ fontFamily: mono, color: CORAL, fontSize: 13 }}>÷</span>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em" }}>{s.title}</h1>
      </div>
      <p style={{ color: MUTED, fontSize: 14, margin: "4px 0 18px 26px", lineHeight: 1.5 }}>
        {s.hostName} paid the bill. Here&apos;s your share — pay them back.
      </p>

      <SplitView session={s} isHost={isHost} />
    </PageShell>
  );
}
