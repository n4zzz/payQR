import { themeFor } from "./providers";
import { SUPABASE_URL } from "./supabase/config";
import { createClient } from "./supabase/server";
import type { Method, ProfilePage, SessionView, ShareState } from "./types";

function publicQrUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/qr-codes/${path}`;
}

type MethodRow = {
  id: string;
  provider: string;
  label: string;
  hint: string | null;
  qr_image_path: string;
};

function rowToMethod(row: MethodRow): Method {
  const theme = themeFor(row.provider);
  return {
    id: row.id,
    label: row.label,
    short: theme.short,
    hint: row.hint ?? theme.defaultHint,
    grad: theme.grad,
    dark: theme.dark ?? false,
    qrUrl: publicQrUrl(row.qr_image_path),
  };
}

// Wallet-only page data for /[username].
export async function getProfilePage(username: string): Promise<ProfilePage | null> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;

  const { data: methods } = await supabase
    .from("payment_methods")
    .select("id, provider, label, hint, qr_image_path")
    .eq("profile_id", profile.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return {
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    methods: (methods ?? []).map(rowToMethod),
  };
}

// Session page data for /s/[slug].
export async function getSession(slug: string): Promise<SessionView | null> {
  const supabase = createClient();
  const { data: session } = await supabase
    .from("split_sessions")
    .select(
      "id, title, subtotal, service_pct, sst_pct, total, host_id, profiles!split_sessions_host_id_fkey(username, display_name)"
    )
    .eq("share_slug", slug)
    .maybeSingle();
  if (!session) return null;

  type HostRel = { username: string; display_name: string | null };
  const hostRel = (session as unknown as { profiles?: HostRel | HostRel[] }).profiles;
  const host = Array.isArray(hostRel) ? hostRel[0] : hostRel;

  const { data: shares } = await supabase
    .from("split_shares")
    .select("id, name, amount, state")
    .eq("session_id", session.id);

  const { data: methods } = await supabase
    .from("payment_methods")
    .select("id, provider, label, hint, qr_image_path")
    .eq("profile_id", session.host_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return {
    slug,
    title: session.title,
    hostName: host?.display_name ?? host?.username ?? "Host",
    hostUsername: host?.username ?? "",
    subtotal: Number(session.subtotal),
    servicePct: Number(session.service_pct),
    sstPct: Number(session.sst_pct),
    total: Number(session.total),
    hostId: session.host_id,
    shares: (shares ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      amount: Number(s.amount),
      state: s.state as ShareState,
    })),
    methods: (methods ?? []).map(rowToMethod),
  };
}
