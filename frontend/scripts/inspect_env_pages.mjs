import { chromium } from 'playwright';

const pages = [
  { name: 'manage', url: 'http://localhost:5174/environment/manage?sortBy=name&sortDir=asc&page=0' },
  { name: 'resources', url: 'http://localhost:5174/environment/resources' },
  { name: 'schedules', url: 'http://localhost:5174/environment/schedules' },
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  for (const p of pages) {
    const page = await context.newPage();
    try {
      await page.goto(p.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const hasH1 = await page.$('h1') !== null;
      const h1Text = hasH1 ? await page.$eval('h1', e => e.innerText) : null;
      const desc = await page.$eval('h1 + p, .ui-text-muted, p', e => e.innerText).catch(() => null);
      const bodySnippet = await page.content().then(c => c.slice(0, 2000));
      console.log(`--- ${p.name} ---`);
      console.log('hasH1:', hasH1);
      console.log('h1Text:', h1Text);
      console.log('desc:', desc);
      console.log('bodySnippet:', bodySnippet.replace(/\n/g, ' '));
    } catch (err) {
      console.error('Error for', p.url, err && (err.message || err));
    } finally {
      await page.close();
    }
  }
  await browser.close();
})();
