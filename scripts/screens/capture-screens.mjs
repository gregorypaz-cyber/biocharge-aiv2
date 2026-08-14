/**
 * Reck — captura dos screenshots das telas do app publicado.
 *
 * POR QUE ESTE SCRIPT EXISTE (leia antes de reinventar):
 * O Chromium NÃO consegue tunelar HTTPS pelo agent proxy deste ambiente — toda
 * navegação direta a https://reck.base44.app dá net::ERR_CONNECTION_RESET (o
 * gateway reseta o handshake TLS do browser). curl/Node, porém, saem normalmente
 * pelo proxy. A solução que FUNCIONA e é usada aqui: um reverse-proxy local em
 * Node serve o app em http://localhost — o Chromium só fala com localhost (sem
 * TLS de saída, sem reset). O Node busca reck.base44.app pelo proxy (fetch com
 * NODE_USE_ENV_PROXY=1). Fontes do Google são roteadas pelo mesmo proxy para
 * manter a tipografia fiel. NÃO tente fazer o Chromium ir direto ao proxy: já
 * foi testado à exaustão e sempre reseta.
 *
 * Uso:
 *   RECK_EMAIL='...' RECK_PASS='...' node scripts/screens/capture-screens.mjs
 * Opcionais: CAP_DATE=YYYY-MM-DD (default: hoje), OUTDIR (default docs/screens).
 * Credenciais vêm do ambiente — nunca commitar.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// ---- bootstrap: TLS/proxy do Node precisam estar no env ANTES do node subir ----
if (process.env.__SCREENS_BOOTSTRAPPED !== '1') {
  const env = { ...process.env, __SCREENS_BOOTSTRAPPED: '1', NODE_USE_ENV_PROXY: '1' };
  if (!env.NODE_EXTRA_CA_CERTS && fs.existsSync('/root/.ccr/ca-bundle.crt')) {
    env.NODE_EXTRA_CA_CERTS = '/root/.ccr/ca-bundle.crt';
  }
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { stdio: 'inherit', env });
  process.exit(r.status ?? 1);
}

const EMAIL = process.env.RECK_EMAIL;
const PASS = process.env.RECK_PASS;
if (!EMAIL || !PASS) {
  console.error('Defina RECK_EMAIL e RECK_PASS no ambiente.');
  process.exit(2);
}

const TARGET = 'https://reck.base44.app';
const PORT = Number(process.env.RP_PORT || 8899);
const ORIGIN = `http://localhost:${PORT}`;
const EXT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const REPO = path.resolve(fileURLToPath(import.meta.url), '../../..');
const OUTDIR = process.env.OUTDIR || path.join(REPO, 'docs/screens');
const DATE = process.env.CAP_DATE || new Date().toISOString().slice(0, 10);

// resolve playwright: local (node_modules) ou global
function loadPlaywright() {
  for (const base of [path.join(REPO, 'node_modules'), '/opt/node22/lib/node_modules']) {
    try { return createRequire(path.join(base, 'x'))('playwright'); } catch { /* next */ }
  }
  return createRequire(import.meta.url)('playwright');
}
const { chromium } = loadPlaywright();

// ---------------- reverse proxy: localhost -> reck.base44.app (via agent proxy) ------------
function filterReqHeaders(h, extHost) {
  const out = {};
  for (const [k, v] of Object.entries(h)) {
    const lk = k.toLowerCase();
    if (['host', 'connection', 'accept-encoding', 'content-length'].includes(lk)) continue;
    out[k] = v;
  }
  out['host'] = extHost || 'reck.base44.app';
  out['accept-encoding'] = 'identity';
  if (out['origin']) out['origin'] = TARGET;
  if (out['referer']) out['referer'] = out['referer'].replaceAll(ORIGIN, TARGET);
  return out;
}
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const body = Buffer.concat(chunks);
    let url, extHost = null;
    const m = req.url.match(/^\/__ext\/([^/]+)(\/.*)?$/);
    if (m) { extHost = m[1]; url = `https://${m[1]}${m[2] || '/'}`; }
    else url = TARGET + req.url;
    try {
      const r = await fetch(url, {
        method: req.method,
        headers: filterReqHeaders(req.headers, extHost),
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
        redirect: 'manual',
      });
      const ctype = r.headers.get('content-type') || '';
      const buf = Buffer.from(await r.arrayBuffer());
      let outBody = buf;
      if (/text|javascript|json|xml|html|css/i.test(ctype)) {
        let s = buf.toString('utf8');
        s = s.replaceAll('https://reck.base44.app', ORIGIN);
        for (const h of EXT_HOSTS) s = s.replaceAll(`https://${h}`, `${ORIGIN}/__ext/${h}`);
        outBody = Buffer.from(s, 'utf8');
      }
      const headers = {};
      r.headers.forEach((v, k) => {
        const lk = k.toLowerCase();
        if (['content-encoding', 'content-length', 'transfer-encoding', 'connection',
             'content-security-policy', 'content-security-policy-report-only',
             'strict-transport-security', 'x-frame-options', 'set-cookie'].includes(lk)) return;
        if (lk === 'location') { headers[k] = v.replaceAll('https://reck.base44.app', ORIGIN); return; }
        headers[k] = v;
      });
      const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
      if (sc.length) headers['set-cookie'] = sc.map((c) =>
        c.replace(/;\s*Secure/gi, '').replace(/;\s*Domain=[^;]+/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax'));
      headers['content-length'] = Buffer.byteLength(outBody);
      res.writeHead(r.status, headers);
      res.end(outBody);
    } catch (e) {
      res.writeHead(502); res.end('proxy error: ' + e.message);
      console.error('PROXY ERR', req.method, req.url, e.message);
    }
  });
});
await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok));
console.log('reverse proxy:', ORIGIN, '->', TARGET);

// ---------------- captura ----------------
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const d = fs.readdirSync(root).filter((e) => /^chromium-\d+$/.test(e)).sort().pop();
    if (d) { const exe = path.join(root, d, 'chrome-linux', 'chrome'); if (fs.existsSync(exe)) return exe; }
  } catch { /* usa default do playwright */ }
  return undefined;
}
fs.mkdirSync(OUTDIR, { recursive: true });

const SCREENS = [
  { key: 'hoje',       route: '/today' },
  { key: 'padroes',    route: '/insights' },
  { key: 'checkin',    route: '/checkin' },
  { key: 'tendencias', route: '/trends' },
  { key: 'historico',  route: '/history' },
  { key: 'saude',      route: '/saude' },
];

const b = await chromium.launch({
  executablePath: findChromium(), headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-background-networking',
         '--font-render-hinting=none', '--force-color-profile=srgb'],
});
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
  isMobile: true, hasTouch: true, colorScheme: 'dark',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();

// login (email/senha)
await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForSelector('input[type=email]', { timeout: 20000 });
await page.fill('input[type=email]', EMAIL);
await page.fill('input[type=password]', PASS);
await page.click('button[type=submit]');
await page.waitForFunction(() => !!localStorage.getItem('base44_access_token'), { timeout: 20000 })
  .catch(() => { throw new Error('Login falhou: token não apareceu. Verifique RECK_EMAIL/RECK_PASS.'); });
await page.waitForTimeout(2500);
const me = await page.evaluate(async () => {
  const t = localStorage.getItem('base44_access_token');
  const id = localStorage.getItem('base44_app_id');
  const r = await fetch(`/api/apps/${id}/entities/User/me`, { headers: { Authorization: 'Bearer ' + t } });
  return r.status;
});
if (me !== 200) { console.error('Auth /me =', me, '(esperado 200). Abortando para não gerar tela deslogada.'); await b.close(); server.close(); process.exit(3); }
console.log('autenticado (/me = 200)');

const results = [];
let failures = 0;
for (const s of SCREENS) {
  await page.goto(`${ORIGIN}${s.route}`, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => console.log('nav warn', s.route, e.message));
  await page.waitForTimeout(3500);              // deixa gráficos/animações assentarem
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  // a nav inferior é position:fixed; num print full-page ela flutua no meio e
  // cobre conteúdo — reancora no rodapé real do documento.
  await page.evaluate(() => {
    const nav = document.querySelector('.meniscus');
    if (nav) {
      document.body.style.position = 'relative';
      document.body.appendChild(nav);
      Object.assign(nav.style, { position: 'absolute', top: 'auto', bottom: '0', left: '0', right: '0' });
    }
  });
  await page.waitForTimeout(500);
  const url = page.url();
  const onLogin = /\/login/.test(url) || (await page.locator('input[type=password]').count()) > 0;
  const file = path.join(OUTDIR, `${DATE}-${s.key}.png`);
  if (onLogin) { console.error(`ABORT ${s.key}: caiu em login (${url}) — não vou salvar tela deslogada.`); failures++; continue; }
  await page.screenshot({ path: file, fullPage: true });   // PNG cru, sem otimizador
  const kb = Math.round(fs.statSync(file).size / 1024);
  results.push({ key: s.key, route: s.route, file: path.relative(REPO, file), kb });
  console.log(`ok ${s.key.padEnd(11)} -> ${path.relative(REPO, file)} (${kb} KB)`);
}
await b.close();
server.close();
if (failures) { console.error(`${failures} tela(s) falharam.`); process.exit(4); }
console.log('\nTodos os arquivos:');
for (const r of results) console.log('  ' + r.file);
process.exit(0);
