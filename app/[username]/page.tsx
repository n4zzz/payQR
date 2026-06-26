import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletScreen } from "@/components/WalletScreen";
import { getProfilePage } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfilePage(username);
  if (!data) return { title: "Not found" };
  return {
    title: `Pay ${data.displayName}`,
    description: `Pay ${data.displayName} — pick a wallet and scan.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await getProfilePage(username);
  if (!data) notFound();
  return <WalletScreen profile={data} />;
}
