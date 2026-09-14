# Deploying the Frontline website to AWS Amplify

## 1. Protect your wallet first
AWS bills a card with no spending cap by default.

1. AWS Console → **Billing → Budgets → Create budget** → *Zero spend budget* (emails you the moment anything costs money).
2. Optionally apply for **AWS Activate** (startup credits).

## 2. Create the app
1. AWS Console → **Amplify** → *Create new app* → **GitHub** → pick `naveendgp/Zeone-AIRA`, branch `main`.
2. Amplify detects Next.js and uses the `amplify.yml` in this repo. Leave it as is.
3. Region: **Asia Pacific (Mumbai) ap-south-1** — closest to Tamil Nadu.

## 3. Environment variables
*App settings → Environment variables.* Copy these from Vercel:

| Name | Notes |
|---|---|
| `GEMINI_API_KEY` | |
| `GEMINI_MODEL` | optional |
| `ELEVENLABS_API_KEY` | |
| `ELEVEN_VOICE_ID`, `ELEVEN_MODEL` | optional |
| `SARVAM_API_KEY` | |
| `STT_PROVIDER` | **must be `sarvam`** |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | (Vercel may call them `KV_REST_API_URL` / `KV_REST_API_TOKEN` — either works) |
| `ADMIN_USER`, `ADMIN_PASSWORD` | |
| `GOOGLE_PLACES_API_KEY` | starts with `AIza…`, Places API (New) enabled |
| `NEXT_PUBLIC_WHATSAPP` | e.g. `919840000000` |
| `ORDER_WEBHOOK_URL` | optional |

**Changing any variable needs a redeploy** (*Deployments → Redeploy this version*). `amplify.yml` copies them into the build; nothing is read live from the console.

## 4. Things that behave differently from Vercel
- **30-second request limit.** Hard limit on Amplify. The slow routes (website reading, AI chat) are capped under it.
- **Upstash from the Vercel Marketplace** is tied to your Vercel account. If you delete the Vercel project, the database may go with it. Before switching off Vercel, create a free database at upstash.com and use its URL/token instead.
- **Visitor city** in `/admin` may be blank — Amplify doesn't always pass it through.

## 5. Custom domain
*Hosting → Custom domains → Add domain.* Amplify issues the HTTPS certificate for free.
