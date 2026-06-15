# PayQR

One link for all your pay-me QRs. Share every wallet on one page; split a bill and friends pay you back by scanning — no app, no account for them.

Inspired by JomQR's "one QR → a profile of links", specialized for **e-wallet payments**. PayQR never holds or moves money — it only displays QR images users upload.

## Stack

- **Next.js** (App Router, TypeScript) + **Supabase** (Postgres + Auth + Storage)
- Styling: inline styles + design tokens (`lib/tokens.ts`)
- Deploy: Vercel + Supabase cloud

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. **Supabase is required:** the app no longer runs on demo data.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration in `supabase/migrations/0001_init.sql` (SQL Editor, or `supabase db push` with the CLI).
3. Copy `.env.local.example` → `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API).
4. Restart `npm run dev`.

## Structure

```
app/
  page.tsx              landing
  [username]/page.tsx   wallet-only public page (SSR)
  s/[slug]/page.tsx     session: split info + embedded wallet
  dashboard/            manage wallet + sessions (stubs)
  login/                auth (stub)
components/
  Wallet.tsx            the Apple Wallet–style card stack (shared)
  SplitView.tsx         bill breakdown + roster + embedded wallet
  PageShell.tsx, LinkTile.tsx
lib/
  queries.ts            data access
  supabase/             client / server / middleware wiring
  money.ts, qr.tsx, providers.ts, tokens.ts, types.ts
supabase/migrations/    SQL schema + RLS + handshake functions
```

## Data model

- **profiles** — public identity (`username`), 1:1 with an auth user
- **payment_methods** — the QRs on a wallet (provider drives the card theme)
- **split_sessions** — one bill/event; `share_slug` is the link capability
- **split_shares** — one row per diner (incl. host); `name` is free text so friends need no account

State handshake: `unpaid → claimed` (friend taps "I've paid", via `claim_share()`) → `confirmed` (host confirms, via `confirm_share()`).

## Roadmap (post-MVP)

QR upload in dashboard · session create form improvements · WhatsApp nudge · DuitNow QR generation (dynamic amounts) · saved groups · analytics.
