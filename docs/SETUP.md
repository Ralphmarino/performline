# Connecting Google Analytics 4 and Search Console

> Deploying on Netlify? Follow **[NETLIFY.md](NETLIFY.md)** instead - it covers these Google steps plus the Netlify site and the daily refresh.

The server reads both APIs with a single Google Cloud **service account**. Nothing is written back; read-only scopes only.

## 1. Create the service account

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project, e.g. `performline-insights`.
2. **APIs & Services → Library**: enable
   - *Google Analytics Data API*
   - *Google Search Console API*
3. **IAM & Admin → Service Accounts → Create service account**. Name it `insights-reader`. No project roles are needed.
4. Open the account → **Keys → Add key → JSON**. Download the file; keep it private (it is git-ignored as `service-account*.json`).
5. Note the account's email, e.g. `insights-reader@performline-insights.iam.gserviceaccount.com`.

## 2. Grant access

### GA4
1. In GA4 go to **Admin → Property → Property access management**.
2. Add the service-account email with the **Viewer** role.
3. Copy the numeric **Property ID** from **Admin → Property settings** (e.g. `123456789`).

### Search Console
1. Open [Search Console](https://search.google.com/search-console), pick the PerformLine property.
2. **Settings → Users and permissions → Add user**: the service-account email with **Full** or **Restricted** permission (Restricted is enough).
3. The `GSC_SITE_URL` must match the property exactly:
   - Domain property → `sc-domain:performline.com`
   - URL-prefix property → `https://performline.com/` (with trailing slash)

## 3. Configure the app

Copy `.env.example` to `.env` and set:

```
DATA_MODE=live
GA4_PROPERTY_ID=123456789
GSC_SITE_URL=sc-domain:performline.com
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

On hosts where you cannot upload a file (Render, Railway, Vercel, Fly), paste the JSON instead:

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}
```

or, for single-line environment UIs such as Netlify, base64-encode the file (`base64 -w0 service-account.json`) into `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`.

Restart the server. `GET /api/health` reports `"mode":"live"` and the header pill reads **Live GA4 + GSC**. If anything is missing the server logs why and falls back to demo data rather than failing.

## 4. Key events (conversions)

`GA4_KEY_EVENTS` lists the key events reported as conversions, in display order. The default mirrors PerformLine's property:

```
GA4_KEY_EVENTS=demo-submission,form_submit,form_start,file_download,click,purchase
```

Any other key event present in the data is appended automatically. Leave the variable blank to use whatever the property reports.

## 5. Blog tracking

`BLOG_PATH_PREFIX=/blog` controls which page paths count as blog content for the Blog Tracker (GA4 page path begins-with filter, matched against Search Console page URLs).

## 6. AI assistant traffic

AI referrals are classified server-side (`server/src/ai.js`) by source host — `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `claude.ai`, `copilot.microsoft.com`, `grok.com`, `meta.ai`, `chat.deepseek.com`, `chat.mistral.ai`, `you.com` and more — and by GA4's own **AI Assistant** channel group / `ai-assistant` medium. They are reported as a separate **AI Assistant** channel everywhere. Add new assistants to the `AI_ENGINES` list as they appear in your referral report.

## 7. Daily refresh, quotas and caching

A full report issues ~7 GA4 Data API requests and ~12 Search Console requests. Reports are stored (Netlify Blobs on Netlify, `server/.cache` elsewhere) and served from the store until they are `REPORT_MAX_AGE_HOURS` old (default 24). `npm run refresh` (or the Netlify scheduled function) rebuilds the standard views once a day; schedule it with cron on a self-hosted box. In-memory caching (`CACHE_TTL_MINUTES`) sits on top. GA4's default quota (25k tokens/day per property) comfortably covers daily use by a team.

Search Console data is final only after ~2-3 days; the most recent days of a month-to-date view may still be filling in.

## 8. PDF export

`POST /api/export/pdf` renders the report in headless Chromium through Playwright. Options:

- Docker image: Chromium is pre-installed, nothing to do.
- Bare host: `npx playwright install chromium` once, or set `CHROMIUM_PATH=/usr/bin/chromium` (or Google Chrome) in `.env`.
- If neither is available the API returns 501 and the UI falls back to the browser print dialog, which uses the same print stylesheet.

## 9. Deploying

Any Node 20+ host works. Build the client (`npm run build`) and run `npm start`; the server serves `client/dist` and the API on `$PORT`. Put it behind your SSO / basic auth of choice — the app has no authentication of its own.
