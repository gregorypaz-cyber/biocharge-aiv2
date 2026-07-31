import React, { useMemo, useState } from 'react';
import { getZone, getZoneColor } from '@/lib/biocharge-utils';

/*
 * YearHeatmap (WHOOP §8) — "o mapa de calor do ano". Grade estilo contribuições:
 * colunas = semanas, linhas = dias (Dom→Sáb), cada célula na cor de zona daquele
 * Recovery. De longe você vê a FORMA do seu ano: blocos vermelhos de gripe,
 * faixas verdes de boa fase. Honestidade (§8): dia sem check-in = célula vazia,
 * nunca interpolada — o vazio é resultado, não falha a esconder. Reusa
 * getZoneColor() — zero cor nova (§2). Toque numa célula → leitura daquele dia.
 */

const DAY_MS = 86400000;
const toISO = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fmtLong = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export default function YearHeatmap({ checkins = [], weeksBack = 18, onSelectDate = null }) {
  const byDate = useMemo(() => {
    const map = new Map();
    checkins.forEach((c) => { if (c?.date && c.recovery_score != null) map.set(c.date, c.recovery_score); });
    return map;
  }, [checkins]);

  const { columns, monthMarks } = useMemo(() => {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const start = new Date(today.getTime() - weeksBack * 7 * DAY_MS);
    start.setDate(start.getDate() - start.getDay()); // volta pro domingo
    const cols = [];
    const marks = [];
    let cur = new Date(start);
    let colIdx = 0;
    while (cur <= today) {
      const col = [];
      for (let dow = 0; dow < 7; dow++) {
        if (cur > today) { col.push(null); continue; }
        const iso = toISO(cur);
        col.push({ iso, score: byDate.get(iso) ?? null });
        // marca de mês: primeira coluna cujo domingo cai num mês novo
        if (dow === 0 && cur.getDate() <= 7) marks.push({ colIdx, label: MONTHS[cur.getMonth()] });
        cur = new Date(cur.getTime() + DAY_MS);
      }
      cols.push(col);
      colIdx++;
    }
    return { columns: cols, monthMarks: marks };
  }, [byDate, weeksBack]);

  const [sel, setSel] = useState(null);

  const cell = (c, ci, ri) => {
    if (!c) return <div key={`${ci}-${ri}`} className="w-3 h-3" />;
    const has = c.score != null;
    const bg = has ? getZoneColor(getZone(c.score)) : 'transparent';
    const isSel = sel?.iso === c.iso;
    return (
      <button
        key={c.iso}
        type="button"
        aria-label={has ? `${fmtLong(c.iso)}: Recovery ${c.score}` : `${fmtLong(c.iso)}: sem check-in`}
        onClick={() => { setSel(c); onSelectDate?.(c.iso); }}
        className="w-3 h-3 rounded-[3px] transition-transform hover:scale-125"
        style={{
          background: has ? bg : undefined,
          opacity: has ? 0.9 : 1,
          border: has ? (isSel ? '1.5px solid white' : 'none') : '1px solid hsl(220 14% 16%)',
          boxShadow: isSel ? '0 0 0 1.5px hsl(220 20% 4%)' : 'none',
        }}
      />
    );
  };

  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold tracking-tight">O seu ano</p>
        <div className="flex items-center gap-1.5 t-micro text-muted-foreground">
          <span>menos</span>
          {['hsl(0,72%,55%)', 'hsl(45,93%,58%)', 'hsl(142,70%,50%)'].map((c) => (
            <span key={c} className="w-2.5 h-2.5 rounded-[3px]" style={{ background: c, opacity: 0.9 }} />
          ))}
          <span>mais</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-full">
          <div className="flex gap-1 pl-0">
            {columns.map((_, ci) => {
              const mk = monthMarks.find((m) => m.colIdx === ci);
              return <div key={ci} className="w-3 t-micro text-muted-foreground/60 text-center" style={{ fontSize: 9 }}>{mk ? mk.label : ''}</div>;
            })}
          </div>
          <div className="flex gap-1">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-1">
                {col.map((c, ri) => cell(c, ci, ri))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 h-5 flex items-center">
        {sel ? (
          sel.score != null ? (
            <p className="t-micro text-muted-foreground">
              <span className="font-semibold text-foreground">{fmtLong(sel.iso)}</span>
              {' · Recovery '}
              <span className="font-semibold" style={{ color: getZoneColor(getZone(sel.score)) }}>{sel.score}</span>
            </p>
          ) : (
            <p className="t-micro text-muted-foreground">
              <span className="font-semibold text-foreground">{fmtLong(sel.iso)}</span> · sem check-in
            </p>
          )
        ) : (
          <p className="t-micro text-muted-foreground/60">Toque num dia para ver a leitura.</p>
        )}
      </div>
    </div>
  );
}
