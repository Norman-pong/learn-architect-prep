import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5188/settings/ai', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

// Check if service workers exist
const swCount = await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL || 'none');
console.log('Service Worker:', swCount);

// Check API_BASE_URL via a fetch probe (create a script that exposes it)
const result = await page.evaluate(async () => {
  // Try to access the module's variables by importing it
  try {
    const mod = await import('/src/api/client.ts');
    return { keys: Object.keys(mod), hasBase: 'API_BASE_URL' in mod };
  } catch (e) {
    return { error: String(e) };
  }
});
console.log('Module import result:', result);

await browser.close();
