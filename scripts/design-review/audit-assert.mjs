/**
 * Reck — Design conformance assertions.
 *
 * Reads the audit.json produced by panel-driver.mjs and FAILS (exit 1) on any
 * violation of the six rules below. It judges conformance, not design; it never
 * changes anything. Each rule is a named assertion; on failure it prints, for
 * every offending element: rule · screen · element · measured value — so the
 * fix loop is debuggable.
 *
 * Rules (floors confirmed against BRAND.md before writing):
 *   R1  no interactive target with width OR height < 44px
 *   R2  no rendered text below 11px  — EXCEPT the nav tab-bar labels, which
 *       BRAND.md §3 explicitly allows at 10px ("a medida da Apple"). Those are
 *       tagged inTabBar by the collector and skipped here.
 *   R3  no mono family with font-weight > 600 (BRAND §3 ceiling = font-semibold)
 *   R4  no emoji in a chrome element (nav/header/rótulo/badge) — BRAND §5;
 *       deliberate user-input emoji (mood/DOMAIN_OF) is excluded by the collector.
 *   R5  no horizontal overflow in a 390px viewport
 *   R6  no literal hex color in the DOM outside index.css tokens — per review
 *       decision, pure black/white neutrals (#fff/#000) are exempt; the collector
 *       already dropped them, so anything present here is a violation.
 *
 * R1/R5 are accessibility/responsive floors, not stated in BRAND.md (noted).
 *
 * Usage: node scripts/design-review/audit-assert.mjs [path/to/audit.json]
 */
import fs from 'node:fs';
import path from 'node:path';

const AUDIT = path.resolve(process.argv[2] || 'scripts/design-review/out/audit.json');

if (!fs.existsSync(AUDIT)) {
  console.error(`audit.json não encontrado em ${AUDIT}\nRode panel-driver.mjs primeiro (contra localhost).`);
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
const screens = report.screens || {};

// A rule collects violations as { screen, el, measured }. `field` names the
// per-screen audit array the rule needs; if it's absent the audit.json is stale
// (driver not re-run) — that's an error, not a silent pass.
const RULES = [
  {
    id: 'R1',
    desc: 'nenhum alvo interativo com largura OU altura < 44px',
    field: 'smallTapTargets',
    collect: (a) => (a.smallTapTargets || []).map((t) => ({ el: t.el, measured: `${t.w}×${t.h}px` })),
  },
  {
    id: 'R2',
    desc: 'nenhum texto renderizado abaixo de 11px (tab bar isenta — BRAND §3; eixos de gráfico isentos — decisão do painel)',
    field: 'tinyText',
    collect: (a) => (a.tinyText || [])
      .filter((t) => !t.inTabBar && !t.inChart)
      .map((t) => ({ el: t.el, measured: `${t.px}px` })),
  },
  {
    id: 'R3',
    desc: 'nenhuma família mono com font-weight > 600 (teto font-semibold — BRAND §3)',
    field: 'monoOverweight',
    collect: (a) => (a.monoOverweight || []).map((t) => ({ el: t.el, measured: `weight ${t.weight} (${t.family})` })),
  },
  {
    id: 'R4',
    desc: 'nenhum emoji em elemento de chrome (nav/header/rótulo/badge) — BRAND §5',
    field: 'emojiInChrome',
    collect: (a) => (a.emojiInChrome || []).map((t) => ({ el: t.el, measured: `${t.emoji} (em ${t.context})` })),
  },
  {
    id: 'R5',
    desc: 'nenhum overflow horizontal em viewport de 390px',
    field: 'horizontalOverflow',
    collect: (a) => (a.horizontalOverflow ? [{ el: '<document>', measured: `docWidth ${a.docWidth} > innerWidth ${a.innerWidth}` }] : []),
  },
  {
    id: 'R6',
    desc: 'nenhuma cor hex literal no DOM fora dos tokens do index.css (neutros #fff/#000 isentos)',
    field: 'hexColors',
    collect: (a) => (a.hexColors || []).map((t) => ({ el: t.el, measured: `${t.value} (@${t.attr})` })),
  },
];

let totalViolations = 0;
const lines = [];

for (const rule of RULES) {
  const perScreen = [];
  let missingData = false;

  for (const [key, screen] of Object.entries(screens)) {
    const a = screen.audit || {};
    if (!(rule.field in a)) { missingData = true; continue; }
    const v = rule.collect(a);
    if (v.length) perScreen.push({ screen: screen.name || key, route: screen.route, violations: v });
  }

  if (missingData) {
    // Fail loud: the collector didn't produce this field — audit.json is stale.
    totalViolations++;
    lines.push(`\n✗ ${rule.id} — ${rule.desc}`);
    lines.push(`    campo '${rule.field}' ausente no audit.json → regenere rodando o panel-driver atualizado.`);
    continue;
  }

  const count = perScreen.reduce((n, s) => n + s.violations.length, 0);
  if (count === 0) {
    lines.push(`\n✓ ${rule.id} — ${rule.desc}`);
    continue;
  }

  totalViolations += count;
  lines.push(`\n✗ ${rule.id} — ${rule.desc}  (${count} violações)`);
  for (const s of perScreen) {
    lines.push(`  ${s.screen} (${s.route}):`);
    for (const v of s.violations) lines.push(`    · ${v.measured}  —  ${v.el}`);
  }
}

console.log(`Suíte de conformidade — Reck  (fonte: ${path.relative(process.cwd(), AUDIT)})`);
console.log(`Base capturada: ${report.base || '?'} · ${report.when || '?'}`);
console.log(lines.join('\n'));

console.log('\n' + '─'.repeat(60));
if (totalViolations === 0) {
  console.log('VERDE — todas as 6 regras passam.');
  process.exit(0);
} else {
  const byRule = RULES
    .map((r) => {
      const c = Object.values(screens).reduce((n, sc) => {
        const a = sc.audit || {};
        return n + (r.field in a ? r.collect(a).length : 0);
      }, 0);
      const missing = Object.values(screens).some((sc) => !((sc.audit || {})[r.field] !== undefined));
      return `${r.id}:${missing ? 'sem-dados' : c}`;
    })
    .join('  ');
  console.log(`VERMELHO — ${totalViolations} violações no total.`);
  console.log(`Por regra → ${byRule}`);
  process.exit(1);
}
