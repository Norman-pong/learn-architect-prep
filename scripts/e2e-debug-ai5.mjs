import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('ai-config')) {
    const text = await res.text();
    console.log('RESPONSE:', res.status(), url, text.slice(0, 100));
  }
});
await page.goto('http://127.0.0.1:5188/settings/ai', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
await browser.close();
