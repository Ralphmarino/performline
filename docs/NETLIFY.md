# Launching on Netlify with live GA4 + Search Console data

This is the end-to-end walkthrough: Google credentials, the Netlify site, and the daily refresh. Budget about 30 minutes. Nothing here needs a credit card; GA4 and Search Console APIs are free and the site fits Netlify's free tier.

## How it runs on Netlify

```
Browser ──> Netlify CDN (client/dist, the React dashboard)
              │
              ├─ /api/*  ──> Netlify Function "api"  (Express)  ──> Netlify Blobs (stored reports)
              │                                                       ▲
              └─ 10:00 UTC daily ──> Scheduled Function "refresh" ───┘  <── GA4 Data API + Search Console API
```

- The **refresh** function runs every day at 10:00 UTC (after Google finalises the previous day), pulls Month over Month, Quarter over Quarter, Year over Year, 6 Months vs 6 Months, month-to-date and last-12-months from GA4 and Search Console, and stores them in Netlify Blobs.
- The **api** function serves those stored reports instantly. A range that has never been built (a custom date range, a preset not in the list) is fetched live on first request and then stored for the next 24 hours.
- PDF export uses the browser's print-to-PDF with the report's print layout, because Chromium cannot run inside a Netlify Function.

## Part 1 - Google: one service account for both APIs

### 1.1 Create the project and enable the APIs

1. Go to <https://console.cloud.google.com/> and sign in with a Google account that can see PerformLine's GA4 property and Search Console.
2. Top bar → project picker → **New project** → name it `performline-insights` → **Create**, then select it.
3. Left menu → **APIs & Services → Library**. Search and **Enable** each of:
   - **Google Analytics Data API**
   - **Google Search Console API**

### 1.2 Create the service account and its key

1. **APIs & Services → Credentials → Create credentials → Service account**.
2. Name: `insights-reader`. Click **Create and continue**, skip the role steps, click **Done**.
3. Click the new account → **Keys** tab → **Add key → Create new key → JSON → Create**. A `.json` file downloads. Treat it like a password.
4. Copy the service account's email address from the list; it looks like `insights-reader@performline-insights.iam.gserviceaccount.com`.

### 1.3 Give it read access to GA4

1. Open <https://analytics.google.com/>, pick the PerformLine property.
2. **Admin** (gear, bottom left) → *Property* column → **Property access management** → **+** → **Add users**.
3. Paste the service-account email, role **Viewer**, untick "Notify by email", **Add**.
4. Still in Admin → **Property settings** → copy the **Property ID** (a number such as `312345678`). You will need it in Part 2.

### 1.4 Give it read access to Search Console

1. Open <https://search.google.com/search-console>, pick the PerformLine property.
2. **Settings → Users and permissions → Add user**. Paste the service-account email, permission **Restricted**, **Add**.
3. Note how the property is named in the picker, because `GSC_SITE_URL` must match it exactly:
   - A **Domain** property shows as `performline.com` → use `sc-domain:performline.com`
   - A **URL-prefix** property shows as `https://performline.com/` → use `https://performline.com/` (keep the trailing slash)

### 1.5 Turn the key file into one environment variable

Netlify environment variables are single-line, so base64-encode the JSON key:

```bash
base64 -i ~/Downloads/performline-insights-xxxx.json | tr -d '\n' | pbcopy
```

(On Linux: `base64 -w0 file.json`.) That puts the encoded key on your clipboard for step 2.3. Delete the downloaded file afterwards if you don't need it locally.

## Part 2 - Netlify

### 2.1 Create the site from GitHub

1. <https://app.netlify.com/> → **Add new site → Import an existing project → GitHub** → authorise Netlify for the `Ralphmarino/performline` repository.
2. Pick the branch to deploy (`main` once this branch is merged, or the feature branch to preview).
3. Build settings are read from `netlify.toml` in the repo, so leave them as detected:
   - Build command: `npm run build`
   - Publish directory: `client/dist`
   - Functions directory: `netlify/functions`
4. Don't deploy yet - click **Add environment variables** (or finish and go to **Site configuration → Environment variables** afterwards).

### 2.2 Add the environment variables

Add these, scope "All" (builds and functions):

| Key | Value |
| --- | --- |
| `DATA_MODE` | `live` |
| `GA4_PROPERTY_ID` | the number from step 1.3 |
| `GSC_SITE_URL` | `sc-domain:performline.com` (or the URL-prefix form) |
| `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | paste the clipboard from step 1.5 |
| `GA4_KEY_EVENTS` | `demo-submission,form_submit,form_start,file_download,click,purchase` |
| `BLOG_PATH_PREFIX` | `/blog` |

Optional: `REPORT_MAX_AGE_HOURS` (default `24`), `WARM_VIEWS` (default `mom,qoq,yoy,h6,mtd,last_12_months`).

### 2.3 Deploy and verify

1. **Deploys → Trigger deploy → Deploy site**. The first build takes 2-3 minutes.
2. Open `https://<your-site>.netlify.app/api/health` - it should return `"mode":"live"` and `"platform":"netlify"`. If it says `demo`, a variable is missing or misspelt; the function log (**Logs → Functions → api**) says which.
3. Open the site. The header pill reads **Live GA4 + GSC** and the status line shows the last refresh time.
4. Kick off the first daily build by hand so the standard views are stored: **Logs → Functions → refresh → Trigger** (or `curl -X POST https://<your-site>.netlify.app/api/refresh`). Reloading the dashboard is now instant.

### 2.4 Daily refresh

The schedule lives in `netlify/functions/refresh.mjs`:

```js
export const config = { schedule: '0 10 * * *' };   // every day at 10:00 UTC (6:00 ET)
```

Change the cron expression and redeploy to move it. Netlify shows each run under **Logs → Functions → refresh**, including which views were rebuilt and how long GA4 and Search Console took.

Search Console data is "final" about 2-3 days after the fact, so the last couple of days of a month-to-date view fill in over the following runs. Full-month, quarter and year comparisons are unaffected.

### 2.5 Custom domain and access

- **Domain management → Add a domain** to serve it from something like `insights.performline.com`.
- The dashboard has no login of its own. For a client-facing report, turn on **Site configuration → Access & security → Site protection** (password or Netlify Identity / SSO on paid plans) so only the team can open it.

## Running the same thing locally

```bash
cp .env.example .env            # DATA_MODE=live, GA4_PROPERTY_ID, GSC_SITE_URL, GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
npm install
npm run dev                      # http://localhost:5173
npm run refresh                  # same daily job, stores JSON under server/.cache
```

With the Netlify CLI (`npm i -g netlify-cli`), `netlify dev` runs the real functions and Blobs locally using the site's environment variables.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Pill says **Demo data** on Netlify | `DATA_MODE`, `GA4_PROPERTY_ID`, `GSC_SITE_URL` or the key variable is missing. Check **Environment variables**, then redeploy (functions read variables at deploy time). |
| `403 PERMISSION_DENIED` in the function log | The service-account email was not added to the GA4 property (step 1.3) or the API is not enabled (step 1.1). |
| `User does not have sufficient permission for site` | `GSC_SITE_URL` does not match the Search Console property type exactly, or the account was not added in Search Console (step 1.4). |
| First load of a custom date range times out | Cold fetch of a long range; reload once and it is stored. Add the preset to `WARM_VIEWS` if you need it daily. |
| Export PDF opens a print dialog | Expected on Netlify. Choose **Save as PDF**; the layout is the same as the server-rendered export. |
