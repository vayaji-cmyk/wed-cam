# Wed Cam (a.k.a. "Ek Roll") — guest photo app

A private, QR-based disposable-camera app for one event. Guests scan a QR
code, enter their name, and shoot up to a set number of photos straight
from their phone browser — no app install, no login. You watch everything
land in a live gallery.

## Status: what's already done vs. what's on you

| Piece | Status |
|---|---|
| Supabase table + RLS policies | ✅ Done — live on your `vayaji-dashboard` project, isolated in `wedcam_photos` |
| App code (camera, gallery, QR page) | ✅ Done — this repo |
| Cloudinary account + upload preset | ⬜ You need to do this — 5 minutes, see below |
| GitHub repo | ⬜ You need to push this folder |
| Vercel deployment | ⬜ You need to import the repo — Vercel requires your own login, I can't do this step for you |

`.env.local` is already filled in with real Supabase credentials. Only the
Cloudinary values need replacing.

## Why Supabase reused an existing project instead of a new one

Free-tier Supabase caps you at 2 active projects, and you already had 2
(`vayaji-dashboard` and the paused `VAYAJI`/bansalsinvntry project).
Creating a third would have either failed or forced an upgrade. Instead,
`wedcam_photos` was added as its own isolated table with its own RLS
policies inside `vayaji-dashboard` — it shares infrastructure but touches
none of that project's existing data or tables.

## Stack

- **Next.js** (App Router) — the app itself, hosted on Vercel
- **Cloudinary** — stores the actual photos, unsigned client-side upload
- **Supabase** — stores only metadata (who took what, when)
- **GitHub** — version control, connected to Vercel for auto-deploy

Guests never touch Supabase or Cloudinary directly — they only see your
Vercel URL.

## Step 1: Cloudinary (you do this — ~5 minutes)

1. Create a free account at cloudinary.com.
2. Your **cloud name** is on the dashboard homepage — copy it.
3. Go to **Settings → Upload → Upload presets → Add upload preset**.
   - Set **Signing Mode** to **Unsigned**.
   - Under **Restrictions**: cap max file size (e.g. 15 MB) and allowed
     formats (jpg, png, heic, webp) so the unsigned endpoint can't be
     abused for arbitrary uploads.
   - Name it `wedcam-unsigned` (or whatever — just match it in step 2).
4. Open `.env.local` in this folder and replace:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` with your cloud name
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` with your preset name

## Step 2: test locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` on your own phone (same wifi, or use
`ngrok http 3000` to test over cellular like a real guest would) and shoot
a few test photos. Check they land at `http://localhost:3000/gallery`.

## Step 3: push to GitHub, deploy to Vercel (you do this)

1. Push this folder to a new GitHub repo.
2. Go to vercel.com → **New Project** → import that repo.
3. In Vercel's project settings → **Environment Variables**, paste in
   every value from your `.env.local`.
4. Deploy. Vercel gives you a live URL — that's what the QR code points to.

If you'd rather I push the code to GitHub for you, give me a repo URL and
I can do that part — Vercel's import step still needs your own click since
it requires authorizing your GitHub account.

## Step 4: generate the QR code

Visit `https://your-deployed-url.vercel.app/qr` and print that page, or
screenshot it for a table sign. The app itself is branded "Ek Roll" — the wedding name shown alongside it comes from `NEXT_PUBLIC_EVENT_NAME`.

## Pages

- `/` — guest camera (enter name, then shoot)
- `/gallery` — all photos, newest first (bookmark for yourself — no login
  gate, so don't share this link publicly)
- `/qr` — printable QR code

## Test before the event, not during it

Test with 3-4 people on their actual phones over cellular data, not your
home wifi, before the wedding. Confirm camera opens on both iPhone and
Android, uploads succeed on a weak connection, and the shot counter
correctly blocks a guest at the limit. Keep a WhatsApp broadcast group as
a fallback so no moment is lost if an upload fails.
