/**
 * Reck — Design Review panel driver.
 *
 * Drives the hosted app (or a local dev server) through the five screens the
 * review covers — Hoje, Padrões, Tendências, Histórico, Check-in — plus /saude,
 * capturing evidence the way the brief demands: full page, slow scroll down and
 * back, a mid-scroll frame that shows what sits *behind* the bottom nav, a crop
 * of the nav bar itself, and a hard DOM audit (tap targets < 44px, text below
 * the 11px floor, font-mono elements above the semibold ceiling, horizontal
 * overflow, truncation).
 *
 * It does NOT judge anything. It only produces artifacts under out/ for a human
 * (or a model reading the PNGs) to evaluate. Nothing here fabricates data.
 *
 * Requires network egress to base44.app. Run:
 *   RECK_EMAIL=... RECK_PASS=... node scripts/design-review/panel-driver.mjs
 *   # optional: BASE_URL=http://localhost:5173  (defaults to https://reck.base44.app)
 *
 * Credentials come from env — never commit them.
 */
import pw from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = pw;

const BASE_URL = (process.env.BASE_URL || 'https://reck.base44.app').replace(/\/$/, '');
const EMAIL = process.env.RECK_EMAIL;
const PASS = process.env.RECK_PASS;
const OUT = path.resolve(process.env.OUT_DIR || 'scripts/design-review/out');
const STATE = path.join(OUT, 'state.json');

if (!EMAIL || !PASS) {
  console.error('Set RECK_EMAIL and RECK_PASS in the environment.');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

// Auto-detect the pre-installed Chromium so this survives a browser build bump.
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const dir = fs.readdirSync(root).filter((e) => /^chromium-\d+$/.test(e)).sort().pop();
    if (dir) {
      const exe = path.join(root, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch { /* fall through to playwright default */ }
  return undefined;
}

const SCREENS = [
  { key: 'today',    route: '/today',    name: 'Hoje' },
  { key: 'insights', route: '/insights', name: 'Padrões' },
  { key: 'trends',   route: '/trends',   name: 'Tendências' },
  { key: 'history',  route: '/history',  name: 'Histórico' },
  { key: 'checkin',  route: '/checkin',  name: 'Check-in' },
  { key: 'saude',    route: '/saude',    name: 'Saúde (via card da Today)' },
];

// Injected into the page: hard, non-subjective measurements.
function domAuditFn() {
  const vw = window.innerWidth;
  const out = {
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    innerWidth: vw,
    docWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
    smallTapTargets: [],
    tinyText: [],
    monoOverweight: [],
    truncated: [],
    signalColorCounts: {},
  };
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const label = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
    return (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : '') + ' :: ' + t).slice(0, 120);
  };
  // Tap targets < 44px (interactive elements)
  const interactive = document.querySelectorAll('a,button,[role=button],[role=tab],[onclick],input,select,summary');
  for (const el of interactive) {
    if (!seen(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) out.smallTapTargets.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height) });
  }
  // Text below 11px floor + font-mono above semibold + signal colors
  const SIGNAL = {
    green: ['rgb(38, 217, 104)', '142'], amber: ['rgb(248, 198, 48)', '45'],
    red: ['rgb(223, 58, 58)'], orange: ['rgb(244, 123, 37)'], blue: ['rgb(48, 171, 232)'], purple: ['rgb(175, 87, 219)'],
  };
  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (!seen(el)) continue;
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      const fs = parseFloat(s.fontSize);
      if (fs && fs < 10.5) out.tinyText.push({ el: label(el), px: +fs.toFixed(1) });
      const mono = /mono/i.test(s.fontFamily) || /JetBrains/i.test(s.fontFamily);
      const w = parseInt(s.fontWeight, 10);
      if (mono && w > 600) out.monoOverweight.push({ el: label(el), weight: w, family: s.fontFamily.split(',')[0] });
      // color usage tally
      const col = s.color;
      for (const [nameC, keys] of Object.entries(SIGNAL)) if (keys.some((k) => col.includes(k))) out.signalColorCounts[nameC] = (out.signalColorCounts[nameC] || 0) + 1;
    }
    // truncation
    if ((s.textOverflow === 'ellipsis' || s.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      out.truncated.push({ el: label(el), clientW: el.clientWidth, scrollW: el.scrollWidth });
    }
  }
  const cap = (a, n) => a.slice(0, n);
  out.smallTapTargets = cap(out.smallTapTargets, 40);
  out.tinyText = cap(out.tinyText, 40);
  out.monoOverweight = cap(out.monoOverweight, 40);
  out.truncated = cap(out.truncated, 40);
  return out;
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1200);
  // let framer-motion entrances finish
  await page.waitForTimeout(600);
}

async function dismissOnboardingIfPresent(page) {
  const skip = page.getByText('Pular tour', { exact: false });
  if (await skip.count().catch(() => 0)) {
    await skip.first().click().catch(() => {});
    await page.waitForTimeout(500);
    const finish = page.getByText('Concluir', { exact: false });
    if (await finish.count().catch(() => 0)) { await finish.first().click().catch(() => {}); await page.waitForTimeout(1500); }
  }
}

async function slowScrollCapture(page, key) {
  const frames = [];
  const metrics = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
  const step = Math.round(metrics.ih * 0.7);
  let y = 0, i = 0;
  // down
  while (y < metrics.sh - metrics.ih) {
    y = Math.min(y + step, metrics.sh - metrics.ih);
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
    await page.waitForTimeout(450);
    const f = path.join(OUT, `${key}-scroll-${String(i).padStart(2, '0')}-y${y}.png`);
    await page.screenshot({ path: f });
    frames.push(f);
    i++;
    if (y >= metrics.sh - metrics.ih) break;
  }
  // mid-scroll frame: park at ~55% so real content sits behind the glass nav bar
  const mid = Math.round((metrics.sh - metrics.ih) * 0.55);
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), mid);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${key}-midscroll-behind-nav.png`) });
  // crop of just the bottom nav region over content
  await page.screenshot({ path: path.join(OUT, `${key}-navbar-crop.png`), clip: { x: 0, y: metrics.ih - 130, width: 390, height: 130 } });
  // back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${key}-top-after-return.png`) });
  return frames;
}

(async () => {
  // Route the browser through the agent egress proxy when present, so it uses
  // the same policy-enforced path curl does (direct connections are reset).
  // The proxy's TLS-inspection layer resets Chromium's TLS 1.3 handshake (curl
  // and openssl, which don't send the same ClientHello, get through fine), so
  // cap the browser at TLS 1.2 to survive inspection. DoH is disabled so DNS
  // resolves via the system resolver instead of a MITM'd dns.google.
  const proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy;
  const args = ['--no-sandbox'];
  if (proxyServer) {
    args.push('--ssl-version-max=tls1.2', '--dns-over-https-mode=off',
      '--disable-features=AsyncDns,DnsHttpsSvcb');
  }
  const launchOpts = { executablePath: findChromium(), headless: true, args };
  // Bypass loopback so a local dev server (BASE_URL=http://localhost:5173) is
  // reached directly — the proxy only accepts HTTPS CONNECT tunnels and 405s a
  // plain-HTTP request to localhost. The app's own base44.com API calls still
  // go through the proxy.
  if (proxyServer) launchOpts.proxy = { server: proxyServer, bypass: 'localhost, 127.0.0.1, ::1' };
  const browser = await chromium.launch(launchOpts);
  const ctxOpts = {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark',
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  };
  if (fs.existsSync(STATE)) ctxOpts.storageState = STATE;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERR: ' + e.message.slice(0, 300)));

  // Login if needed
  await page.goto(`${BASE_URL}/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  if (/login/i.test(page.url()) || (await page.locator('input[type=email]').count())) {
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASS);
    await page.click('button[type=submit]');
    await page.waitForTimeout(4000);
    await settle(page);
    await ctx.storageState({ path: STATE });
  }
  await dismissOnboardingIfPresent(page);
  console.log('Landed at:', page.url());

  const report = { base: BASE_URL, when: new Date().toISOString(), screens: {} };

  for (const s of SCREENS) {
    console.log(`\n=== ${s.name} (${s.route}) ===`);
    await page.goto(`${BASE_URL}${s.route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);
    await dismissOnboardingIfPresent(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${s.key}-01-top.png`) });
    await page.screenshot({ path: path.join(OUT, `${s.key}-02-full.png`), fullPage: true });
    await slowScrollCapture(page, s.key);
    const audit = await page.evaluate(domAuditFn);
    report.screens[s.key] = { name: s.name, route: s.route, finalUrl: page.url(), audit };
    console.log(`  scrollH=${audit.scrollHeight} overflowX=${audit.horizontalOverflow} smallTaps=${audit.smallTapTargets.length} tinyText=${audit.tinyText.length} monoBold=${audit.monoOverweight.length} trunc=${audit.truncated.length}`);
  }

  // Today → tap the health card to reach /saude the real way, if present.
  await page.goto(`${BASE_URL}/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);
  const healthCard = page.locator('a[href*="saude"], [href="/saude"]').first();
  if (await healthCard.count().catch(() => 0)) {
    await healthCard.scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: path.join(OUT, 'today-healthcard-before-tap.png') });
    await healthCard.click().catch(() => {});
    await settle(page);
    await page.screenshot({ path: path.join(OUT, 'saude-via-card.png') });
    report.healthCardReached = page.url();
  }

  report.consoleErrors = consoleErrors.slice(0, 30);
  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(report, null, 2));
  console.log('\nWrote', path.join(OUT, 'audit.json'));
  console.log('Console errors:', consoleErrors.length);
  await browser.close();
})().catch((e) => { console.error('DRIVER FAILED:', e.message); process.exit(1); });
