import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGE ERROR:', err));
page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('response', (res) => {
  const url = res.url();
  if (url.includes(':8787')) {
    console.log('NETWORK:', res.status(), url);
  }
});
page.on('requestfailed', (req) => {
  console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText);
});
await page.goto('http://127.0.0.1:5188/settings/ai', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
// Click test connection button
const btn = await page.$('button:has-text("测试连接")');
if (btn) {
  await btn.click();
  await page.waitForTimeout(2000);
}
await browser.close();
