# GymPilot — Gym Management

Members, fees, attendance, expenses and WhatsApp messages in one place. Built with Next.js (JavaScript / JSX).

## Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000

### Demo accounts
| Role  | Username | Password   | Can do |
|-------|----------|------------|--------|
| Owner | `owner`  | `owner123` | Everything: payments, expenses, reports, settings, staff accounts |
| Staff | `staff`  | `staff123` | Members, take fees, reminders, check-ins (no money totals, no reports) |

## Features
- **Dashboard**: active members, monthly collection, unpaid fees, today's check-ins, and a 6-month income vs expenses chart
- **Members**: search and filter (Unpaid / Due soon / Paid / Frozen / Left). Unpaid members get a red mark
- **Fee received**: records the payment, moves the due date forward, and creates a numbered receipt that you can send on WhatsApp or print
- **Reminders**: one-click WhatsApp fee reminders, with a log of who was reminded
- **Attendance**: front-desk check-in, plus a QR code that members scan to check themselves in (`/checkin`). Members with unpaid fees are flagged at the door. A "stopped coming" list comes with a one-click come-back message
- **Freeze / Left**: pause a membership (the due date moves forward when it's unfrozen) or mark a member as left
- **Expenses & Reports**: record rent, salaries and bills; see real profit, category breakdowns and trends; download a monthly CSV
- **Settings**: gym details, plan prices, message templates, staff accounts, passwords, and a demo data reset

- **Admissions (Join QR)**: new people scan the Join QR, pick a plan and send a request (`/join`). Staff approve it, take the first fee (plan + admission fee), and the person becomes a member with a receipt
- **WhatsApp AI bot** (`bot/`): replies to WhatsApp messages using your plans, prices and gym info, knows each member's fee status, sends the Join link to new people, and sends fee reminders automatically every day

## Data
- **Locally**, data is saved in `data/db.json`.
- **Online**, data is saved in **Upstash Redis**. It's used automatically when the `KV_REST_API_URL` / `KV_REST_API_TOKEN` environment variables are set.

Demo data is created automatically on first run. **Settings → Reset demo data** restores it.

## Deploy to Vercel (free)
1. Push this folder to a GitHub repository.
2. On vercel.com: **Add New → Project** → import the repository → **Deploy**.
3. In the project: **Storage → Create / Connect → Upstash (Redis)** → connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
4. **Settings → Environment Variables** → add `SESSION_SECRET` (any long random text).
5. **Deployments → Redeploy**. Open the site, log in, then print the QR codes from **Attendance → QR codes**.

Times are shown in Pakistan time (`Asia/Karachi`). To change that, set `APP_TIMEZONE`.

**QR posters never expire.** They always point to your main Vercel address, even if you open the site through a deployment link. If you add your own domain later, set `APP_URL` (for example `https://gympilot.pk`) and print the posters again.

## WhatsApp AI bot (runs on the gym PC)
The bot needs a computer that stays on, so it can't run on Vercel. It uses the same database as the website.
1. `npm run bot:setup` (first time only)
2. Copy `bot/.env.example` to `bot/.env` and fill it in:
   - `GEMINI_API_KEY`: free key from https://aistudio.google.com/apikey. Without it, the bot sends simple fixed replies.
   - `APP_URL`: your Vercel address, used for the Join link.
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN`: copy them from Vercel → Storage → Upstash → `.env.local`.
3. `npm run bot` → scan the QR (it shows in the terminal **and** in the website under **Settings**).

Tips:
- Use a separate gym WhatsApp number, not a personal one.
- If you reply to someone yourself, the bot stays quiet in that chat for 30 minutes.
- Turn auto-replies and automatic reminders on or off in **Settings**.

## Before going live with real data
- Set a strong `SESSION_SECRET`.
- Change the demo passwords, or delete the demo accounts.
- Run **Reset demo data** only for demos. It erases everything.
