import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const requests = [];
page.on('request', (req) => {
  const url = req.url();
  if (url.includes(':8787') || url.includes('api')) {
    requests.push({ url, method: req.method() });
  }
});
page.on('response', (res) => {
  const url = res.url();
  if (url.includes(':8787') || url.includes('api')) {
    console.log('NETWORK:', res.status(), res.request().method(), url);
  }
});
page.on('pageerror', (err) => console.log('PAGE ERROR:', err));
page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));

await page.goto('http://127.0.0.1:5188/settings/ai', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

// Click test connection button
const btn = await page.$('button:has-text("测试连接")');
if (btn) {
  await btn.click();
  await page.waitForTimeout(2000);
}

console.log('--- API requests ---');
for (const r of requests) {
  console.log(r.method, r.url);
}

await browser.close();
