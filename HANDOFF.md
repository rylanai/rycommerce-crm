# rycommerce-crm handoff (current — 2026-07-24)

Real-estate cash-offer CRM: leads (Meta form + vendor webhooks) → Kanban pipeline.
Repo: github.com/rylanai/rycommerce-crm (private).

## Two machines
- **MacBook Air (`camrynoliver`)** — primary dev machine. Has the latest repo AND the
  Speed-to-Lead auto-texter. **The auto-texter only runs here** (it sends from this Mac's
  Messages = Rylan's real number).
- **Mac Mini (`rylan369`)** — secondary. If you work here, `git pull` first (it lags), and
  note the auto-texter is NOT here.

## Deploy targets (the old handoff got this wrong)
- **Frontend (Next.js)** → **Vercel**. Production deploys are CLI-only:
  `cd ~/rycommerce-crm/frontend && npx -y vercel@latest --prod --yes` (GitHub auto-deploys
  error). Vercel CLI auth is expired on the Air — deploy from whichever machine is logged in.
- **Backend (Express + Postgres, all in backend/index.js)** → **Railway**, auto-deploys on
  `git push origin main`. Live at `https://backend-production-da82.up.railway.app`.
- **backend/.env is NOT needed** for normal work — everything talks to the live Railway URL.
  Do NOT `vercel env pull` in backend/ (backend env lives on Railway, not Vercel). Only pull
  it (from Railway) if you actually run the API locally for dev.
- Frontend has `frontend/.env.local` (NEXT_PUBLIC_API_URL → the Railway backend).

## Current features / state
- CRM tabs → sources; intake default = Spencer's List; set `stage` explicitly (backend
  default is always "Asking Price"). Offers = `Offered:` note line + "Offer Sent 👀". See
  the full ops doc `~/Downloads/rycommerce-CRM-runbook.md`.
- **Speed-to-Lead webhook: LIVE.** In iSpeedToLead → Integrations → Webhook: clean URL
  `https://backend-production-da82.up.railway.app/api/leads/speedtolead` + header
  `x-api-key: a97570a95ddb7d468862c01b8ac4753571a7d8732d71fd06feae06e10719e628` (their
  validator rejects `?token=`). Leads land in **PPL** (red flag). Address-duplication bug
  is fixed + deployed.
- **Speed-to-Lead auto-texter (on the Air only):** `~/stl_autotext.py` + LaunchAgent
  `com.rylan.stlautotext`, control `~/stl on|off|pause|start|status`. **Currently OFF
  (paused).** Sequence per new speedtolead lead: 9am–5pm lead-local → +15s reach-out →
  +5s "Is {address} the correct address?" → first yes-type reply → "Ok great, how much…"
  + move card to `Gathering Info ✍️` → reply with a price → notes `Asking:`. Reads replies
  from this Mac's Messages DB. Needs Accessibility + Full Disk Access (granted on the Air).

## THE ONE OPEN ITEM
CRM **PPL "Auto-text ON/OFF" toggle button** — coded + pushed (backend flag endpoint
`/api/settings/autotext` is live). The button just needs a **frontend `vercel --prod`
deploy** from a machine with valid Vercel auth. Until then `~/stl on/off` controls the
same flag.

## Gotchas
- Repo has two-machine force-push churn: `git fetch` + reset to origin/main before editing
  repo code, then re-apply. Backend → Railway on push; frontend → Vercel CLI.
- CRM POST responses have literal newlines in `notes` → parse with
  `json.loads(..., strict=False)`.
- Dashboard password: `rycommerce2024`.
