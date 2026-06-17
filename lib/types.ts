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

// A single meal-order line in itemized mode.
export type Item = { name: string; price: number };

export type Share = {
  id?: string;
  name: string;
  amount: number;
  state: ShareState;
  items?: Item[]; // itemized mode only
};

export type SessionMode = "equal" | "itemized";

// One person (excl. host) in the create form's itemized mode.
export type DraftPerson = { name: string; items: Item[] };

// What the create-session form submits.
export type SessionDraft = {
  title: string;
  mode: SessionMode;
  servicePct: number;
  sstPct: number;
  hostName: string;
  // equal mode
  subtotal: number;
  names: string[];
  // itemized mode
  people: DraftPerson[];
};

export type SessionView = {
  slug: string;
  title: string;
  hostId?: string; // present for persisted (DB) sessions
  hostName: string;
  hostUsername: string;
  mode?: SessionMode; // defaults to "equal" when absent
  subtotal: number;
  servicePct: number;
  sstPct: number;
  total: number;
  shares: Share[];
  methods: Method[];
};
