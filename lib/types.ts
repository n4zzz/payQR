// A wallet method as the UI needs it (theme already resolved from provider).
export type Method = {
  id: string;
  label: string;
  short: string;
  hint: string;
  grad: [string, string];
  dark: boolean;
  qrSeed?: string; // prototype/demo QR (generated)
  qrUrl?: string; // real uploaded image
};

export type ProfilePage = {
  username: string;
  displayName: string;
  methods: Method[];
};

export type ShareState = "host" | "unpaid" | "claimed" | "confirmed";

export type Share = {
  id?: string;
  name: string;
  amount: number;
  state: ShareState;
};

// What the create-session form collects (host included separately).
export type SessionDraft = {
  title: string;
  subtotal: number;
  servicePct: number;
  sstPct: number;
  hostName: string;
  names: string[];
};

export type SessionView = {
  slug: string;
  title: string;
  hostId?: string; // present for persisted (DB) sessions; absent for preview links
  hostName: string;
  hostUsername: string;
  subtotal: number;
  servicePct: number;
  sstPct: number;
  total: number;
  shares: Share[];
  methods: Method[];
};
