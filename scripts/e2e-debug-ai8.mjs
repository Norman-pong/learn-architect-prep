import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', (msg) => console.log(msg.text()));

await page.goto('http://127.0.0.1:5188/settings/ai', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

// Patch fetch to capture actual URL
await page.evaluate(() => {
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    window.__lastFetchUrl = url;
    return origFetch.apply(this, args);
  };
});

// Trigger AI config fetch
await page.evaluate(async () => {
  const mod = await import('/src/api/client.ts');
  await mod.fetchWithAuth('/api/ai-config').catch(() => {});
});

const lastUrl = await page.evaluate(() => window.__lastFetchUrl);
console.log('Last fetch URL:', lastUrl);

await browser.close();
