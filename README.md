<div align="center">

# payQR

### Get paid back — without the awkward group-chat chase.

You covered the whole table. Again. **payQR** turns *"eh, settle later ya"* into a link your friends actually tap.

One link for all your e-wallet QRs. Split any bill in seconds. Watch the payments roll in.

[![Live demo](https://img.shields.io/badge/▶_Try_it_live-re--pay--mu.vercel.app-0E6B5C?style=for-the-badge)](https://re-pay-mu.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/status-beta-E8A83C)

</div>

---

## 😩 The problem

You pay first "for convenience." Then you spend a week being the friend who sends *"hi, RM18.66 ya 🙏"* five times. QR screenshots get buried in the chat. Nobody remembers who actually paid. *"What's your TNG number ah?"*

## ✨ Meet payQR

A pay-me page + a bill-splitter that does the awkward part for you.

> **TNG, MAE, GrabPay, bank transfer — all on one link.** Send it once. Your friends pick a wallet, scan, done. You see exactly who's paid. payQR never holds or moves a single ringgit — it just makes getting it back effortless.

## 💡 Inspired by JomQR

payQR began with a simple idea borrowed from **[JomQR](https://jomqr.my/)** — keep all your bank & e-wallet QRs in **one place, behind one link**. Then we asked: what if it also handled the *annoying part* of group payments?

So payQR adds what comes after the scan:

- **🧮 Auto-calculated splits** — drop in the mamak bill (service charge + SST and all) and it works out exactly what each person owes — split evenly, or line-by-line by what everyone ordered.
- **💬 Straight to the group chat** — one tap sends a pay-me link into WhatsApp; everyone settles by scanning.

And it's not just for food. Housemates splitting the **monthly utility bills**, group trips, patungan gifts, that recurring "who owes what" — anywhere money needs to flow back to whoever fronted it, payQR works.

## 🎯 Why you'll love it

| | |
|---|---|
| 🪪 **All your wallets, one link** | `payqr.my/yourname` — an Apple Wallet–style card stack of every QR you own. Tap, scan, paid. |
| 🧾 **Split bills in seconds** | Even split *or* by-order (each person pays for what they ate). **Service charge + SST done for you** — no calculator, no arguments. |
| ✂️ **Just screenshot the QR** | Snap your whole banking app screen — payQR finds the QR and crops it perfectly. No fiddling. |
| 🤝 **Know who actually paid** | Friends tap *"I've paid"*, you tap *"Confirm"* when it lands. No more guessing. |
| 💸 **Friends pay their way** | They choose whichever wallet they like from your page and scan. One tap, no app to install. |
| 🔗 **Made for the group chat** | Every split comes with a ready-to-paste WhatsApp message. Drop it and you're done. |

## 🍜 Perfect for

Mamak runs · group dinners · the trip someone always fronts · **housemates splitting utilities & rent** · patungan gifts · "I'll bank in later" that never happens.

## 🔒 Built honest

payQR **never touches your money**. It only shows the QR images you upload — so it needs no banking licence, and you stay in control. The golden rule, baked into every pay screen: **check the recipient's name in your banking app before you pay.**

## 📸 Screenshots

> _Add a few here — your wallet page, a split session, and the share screen make the pitch instantly._
>
> `docs/wallet.png` · `docs/split.png` · `docs/share.png`

---

## 🛠️ For developers

payQR is a **Next.js 14 + Supabase** app.

| Layer | Stack |
|------|-------|
| Frontend | Next.js 14 (App Router, Server Actions), TypeScript |
| Backend | Supabase — Postgres + Auth (Google) + Storage, with Row-Level Security |
| QR magic | jsQR (client-side detect + crop) |
| Hosting | Vercel |

### Quickstart

```bash
git clone <your-repo-url> && cd payqr
npm install
cp .env.local.example .env.local   # fill in the values below
npm run dev                         # → http://localhost:3000
```

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Supabase setup
1. Create a project (Singapore region recommended).
2. **SQL Editor** → run `supabase/migrations/0001_init.sql`, then `0002_split_modes.sql` — creates tables, RLS, the claim/confirm functions, and the `qr-codes` storage bucket.
3. **Authentication → Providers → Google**: enable + paste your Google OAuth Client ID/Secret (redirect URI: `https://<ref>.supabase.co/auth/v1/callback`).
4. **Authentication → URL Configuration**: set **Site URL** and add your app URL(s) to **Redirect URLs** (e.g. `http://localhost:3000/**`).

### Project structure

```
app/
  page.tsx                home → own wallet / login / onboarding
  [username]/page.tsx     public wallet page (SSR)
  s/[slug]/page.tsx       session (login-gated): split + embedded wallet
  login/  onboarding/     Google auth + username claim
  auth/callback/route.ts  OAuth callback
  dashboard/              wallet manager · sessions list · new session
    sessions/actions.ts   create / delete session (server actions)
components/               Wallet · SplitView · WalletManager · NewSessionForm · …
lib/                      queries · money · qr · qrCrop · supabase · tokens · …
supabase/migrations/      SQL schema + RLS + functions
```

### Data model

| Table | Purpose |
|------|---------|
| `profiles` | Public identity (`username`), 1:1 with an auth user |
| `payment_methods` | The QRs on a wallet; `provider` sets the card theme |
| `split_sessions` | One bill; `share_slug` = the link, `split_mode` = equal \| itemized |
| `split_shares` | One row per diner; `items` (jsonb) holds the order in itemized mode |

Handshake: `unpaid → claimed` (friend, `claim_share()`) → `confirmed` (host, `confirm_share()`).

### Deploy
Push to GitHub → import on **Vercel** → set the three `NEXT_PUBLIC_*` env vars → add your Vercel domain to Supabase Redirect URLs. Custom domain later is a one-variable switch.

## 🗺️ Roadmap

WhatsApp nudge for stragglers · reorder wallet cards · DuitNow QR generation (one-tap dynamic amounts) · saved groups · analytics · security hardening before public launch.

---

<div align="center">

**payQR** · Pay me back, the easy way. · Made in Malaysia 🇲🇾 · Beta

</div>
