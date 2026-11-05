/**
 * Server-side PDF export. Renders the dashboard in print mode with headless Chromium (Playwright) so the
 * PDF matches the on-screen report pixel for pixel. If Playwright is not installed the route returns 501 and
 * the client falls back to the browser's own print-to-PDF with the same print stylesheet.
 */
export async function renderPdf({ baseUrl, search, notes, theme = 'light' }) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const err = new Error('Playwright is not installed on the server - use the browser print fallback');
    err.status = 501;
    throw err;
  }
  const browser = await playwright.chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    // Point at a system Chromium when the bundled browser is unavailable (Docker, Render, this sandbox...)
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: theme === 'dark' ? 'dark' : 'light' });
    await context.addInitScript((payload) => {
      window.__PRINT_NOTES = payload.notes;
      window.__PRINT_THEME = payload.theme;
    }, { notes, theme });
    const page = await context.newPage();
    const url = new URL(baseUrl);
    url.search = search;
    url.searchParams.set('print', '1');
    url.searchParams.set('theme', theme);
    await page.goto(url.toString(), { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__REPORT_READY === true, null, { timeout: 60_000 });
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(400);
    return await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:#6b7280;padding:0 10mm;display:flex;justify-content:space-between;font-family:Inter,Arial,sans-serif"><span>PerformLine Insights</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    });
  } finally {
    await browser.close();
  }
}
