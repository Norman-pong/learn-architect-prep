import { chromium } from 'playwright';

const routes = [
  '/',
  '/login',
  '/learn',
  '/review',
  '/quiz',
  '/stats',
  '/error-book',
  '/weakness',
  '/exam',
  '/writing',
  '/settings/ai',
];

const results = [];

const browser = await chromium.launch({ headless: true });
for (const route of routes) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  try {
    await page.goto(`http://127.0.0.1:5188${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText || '');
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
    results.push({
      route,
      ok: text.length >= 50,
      textLen: text.length,
      errors,
      screenshotSize: screenshot.length,
      sample: text.slice(0, 200).replace(/\s+/g, ' '),
    });
  } catch (e) {
    results.push({
      route,
      ok: false,
      textLen: 0,
      errors: errors.concat([String(e)]),
      screenshotSize: 0,
      sample: '',
    });
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
