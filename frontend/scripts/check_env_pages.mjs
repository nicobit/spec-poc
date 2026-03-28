import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const outDir = path.resolve(process.cwd(), 'tmp-screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const pages = [
  { name: 'manage', url: 'http://localhost:5174/environment/manage?sortBy=name&sortDir=asc&page=0' },
  { name: 'resources', url: 'http://localhost:5174/environment/resources' },
  { name: 'schedules', url: 'http://localhost:5174/environment/schedules' },
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const results = [];
  for (const p of pages) {
    const page = await context.newPage();
    try {
      console.log(`Visiting ${p.url}`);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      // wait a bit for SPA render
      await page.waitForTimeout(500);

      // try to find header and description
      const h1 = await page.locator('h1').first().innerText().catch(() => null);
      // description often directly under h1 in layout: <p> or .ui-text-muted
      let desc = null;
      const candidate = await page.locator('h1 + p, .ui-text-muted, .page-description, .ui-panel p').first().innerText().catch(() => null);
      if (candidate) desc = candidate;

      const shotPath = path.join(outDir, `${p.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });

      results.push({ name: p.name, url: p.url, h1, desc, screenshot: shotPath });
      console.log(`Captured ${p.name}`);
    } catch (err) {
      console.error(`Error capturing ${p.url}:`, err && (err.message || err));
      results.push({ name: p.name, url: p.url, error: String(err) });
    } finally {
      await page.close();
    }
  }
  await browser.close();
  const out = path.resolve(process.cwd(), 'tmp-screenshots', 'report.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('Report written to', out);
  console.log(JSON.stringify(results, null, 2));
})();
