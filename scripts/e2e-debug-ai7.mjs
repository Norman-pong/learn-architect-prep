import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Intercept fetch and log actual URLs
await page.addInitScript(() => {
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0].url;
    console.log("FETCH:", url);
    return origFetch.apply(this, args);
  };
});

page.on("console", (msg) => console.log(msg.text()));

await page.goto("http://127.0.0.1:5188/settings/ai", { waitUntil: "networkidle", timeout: 15000 });
await page.waitForTimeout(2000);

// Click test connection button
const btn = await page.$('button:has-text("测试连接")');
if (btn) {
  await btn.click();
  await page.waitForTimeout(2000);
}

await browser.close();
