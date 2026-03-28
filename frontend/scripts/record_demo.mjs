import { chromium } from 'playwright';

// Simple demo recorder: navigates Manage -> open first Details -> Back
// Usage: from frontend folder run `npm run record:demo` (install deps and browsers first)

const DEFAULT_PORTS = [process.env.PORT, process.env.VITE_PORT, '5174', '5175', '5173', '5172'].filter(Boolean);

async function probePort(port, timeout = 1500) {
  const url = `http://localhost:${port}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res.ok || res.status === 200 || res.status === 204;
  } catch (e) {
    clearTimeout(id);
    return false;
  }
}

async function detectBaseUrl() {
  for (const p of DEFAULT_PORTS) {
    try {
      // probe root for a successful response
      // Some dev servers redirect, so accept any response without throwing as success
      const ok = await probePort(p);
      if (ok) return `http://localhost:${p}`;
    } catch { /* continue */ }
  }
  // fallback to env or default
  const fallback = process.env.PORT || process.env.VITE_PORT || '5175';
  return `http://localhost:${fallback}`;
}

const BASE_PROMISE = detectBaseUrl();

async function run() {
  // Allow HEADLESS=true to run in CI; default to visible browser with slight slow motion for clarity.
  const headless = (process.env.HEADLESS || 'false').toLowerCase() === 'true';
  const slowMo = Number(process.env.SLOWMO || '150');
  const browser = await chromium.launch({ headless, args: ['--window-size=1280,720'], slowMo });
  const context = await browser.newContext({
    recordVideo: { dir: 'demos', size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    const BASE = await BASE_PROMISE;
    console.log('Opening', `${BASE}/environment/manage`);
    await page.goto(`${BASE}/environment/manage`, { waitUntil: 'networkidle' });
    // wait for list to load (look for the page title or an environment row)
    await page.waitForSelector('h1:has-text("Manage Environments")', { timeout: 15000 });

    // take a screenshot of the list for debugging if needed
    await page.screenshot({ path: 'demos/list.png' });

    // click first Details button (use a robust selector). Retry a few times to allow slow rendering.
    let firstDetails = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      firstDetails = await page.$('button:has-text("Details")');
      if (firstDetails) break;
      await page.waitForTimeout(1000);
    }

    if (firstDetails) {
      await firstDetails.click();
      // wait for details page heading
      await page.waitForSelector('h1:has-text("Environment details")', { timeout: 15000 });
      // screenshot details
      await page.screenshot({ path: 'demos/details.png' });

      // click the in-app Back button so history and state restoration are exercised
      const backBtn = await page.$('button:has-text("Back")');
      if (backBtn) {
        await backBtn.click();
      } else {
        // fallback to history back
        await page.goBack({ waitUntil: 'networkidle' });
      }
      // allow time for list to re-render
      await page.waitForTimeout(1200);
    } else {
      console.warn('No Details button found on Manage page after retries');
      await page.screenshot({ path: 'demos/no-details.png' });
    }

    console.log('Demo interactions completed, closing...');

    } catch (err) {
    console.error('Demo recording failed:', err);
  } finally {
      // give recorder a moment to flush
      await page.waitForTimeout(500);
      // close context to finalize video
      await context.close();
      await browser.close();
      console.log('Video and screenshots saved to frontend/demos/ (filename auto-generated)');
  }
}

run();
