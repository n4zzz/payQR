// Each payment provider has a fixed Wallet-card identity (gradient + badge), so
// users never pick colours — the look stays consistent. Derived from the
// `provider` column on payment_methods.
export type Provider = "tng" | "mae" | "grab" | "bank" | "other";

export type ProviderTheme = {
  short: string;
  grad: [string, string];
  dark?: boolean;
  defaultHint: string;
  defaultLabel: string;
};

export const PROVIDERS: Provider[] = ["tng", "mae", "grab", "bank", "other"];

export const PROVIDER_THEME: Record<Provider, ProviderTheme> = {
  tng: { short: "TNG", grad: ["#2B6BE4", "#1640A8"], defaultHint: "DuitNow QR", defaultLabel: "TNG eWallet" },
  mae: { short: "MAE", grad: ["#F6C544", "#E59500"], dark: true, defaultHint: "DuitNow QR", defaultLabel: "Maybank MAE" },
  grab: { short: "Grab", grad: ["#16C25E", "#00913C"], defaultHint: "DuitNow QR", defaultLabel: "GrabPay" },
  bank: { short: "Bank", grad: ["#13877A", "#0A4A40"], defaultHint: "Account no.", defaultLabel: "Bank transfer" },
  other: { short: "Pay", grad: ["#6B7280", "#374151"], defaultHint: "Scan to pay", defaultLabel: "" },
};

export function themeFor(provider: string): ProviderTheme {
  return PROVIDER_THEME[provider as Provider] ?? PROVIDER_THEME.other;
}
