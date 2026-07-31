import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { detectMoments } from '@/lib/moment-engine';

/* ═══ O RECK NOTOU ════════════════════════════════════════════════════════════
   Uma revelação determinística por dia — o app deixando de só explicar/prescrever
   e passando a PERCEBER. O motor (moment-engine) devolve os candidatos gated; aqui
   só escolhemos qual mostrar e damos a moldura.

   Não-repetição sem servidor: guardamos {data, assinatura} no localStorage.
   - Mesmo dia → mostra sempre o mesmo (estável ao dar refresh/rolar).
   - Novo dia → pula a assinatura de ontem (não repete o mesmo card), a menos que
     nada mais tenha cruzado o portão.
   Uma sequência que CRESCE (3→4 manhãs) tem assinatura nova e reaparece de propósito.

   Silêncio honesto (BRAND §8): sem momento → nada renderiza. Nunca um card de
   preenchimento. */

const STORE_KEY = 'reck-notou-shown';

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function writeStore(v) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

const TONE = {
  positive: {
    accent: 'hsl(142,70%,50%)',
    border: 'hsl(142 70% 50% / 0.28)',
    chip: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  },
  caution: {
    accent: 'hsl(45,93%,58%)',
    border: 'hsl(45 93% 58% / 0.28)',
    chip: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  },
};

export default function ReckNotouCard({ checkins = [], today }) {
  const moment = useMemo(() => {
    // A observação é sobre HOJE: se o check-in mais recente não é de hoje, cala
    // (não afirmar "teu HRV hoje" sobre um dado de ontem).
    const newest = [...checkins].filter((c) => c?.date).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    if (!newest || (today && newest.date !== today)) return null;

    const moments = detectMoments(checkins);
    if (!moments.length) return null;

    const store = readStore();
    if (store.date === today) {
      return moments.find((m) => m.signature === store.signature) || moments[0];
    }
    return moments.find((m) => m.signature !== store.signature) || moments[0];
  }, [checkins, today]);

  useEffect(() => {
    if (!moment) return;
    const store = readStore();
    if (store.date !== today || store.signature !== moment.signature) {
      writeStore({ date: today, signature: moment.signature });
    }
  }, [moment, today]);

  if (!moment) return null;
  const tone = TONE[moment.tone] || TONE.positive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.12 }}
      className="relative overflow-hidden rounded-2xl border bg-card p-4"
      style={{ borderColor: tone.border }}
    >
      {/* Derrame de luz na cor do tom — a revelação "acende" o card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full"
        style={{ background: `radial-gradient(circle, ${tone.accent}, transparent 70%)`, opacity: 0.15 }}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: tone.accent }} />
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: tone.accent }}>
            O Reck notou
          </h3>
        </div>

        {/* A frase JÁ carrega o número (o painel: "78" era dito 3× na tela). Sem
           chip de evidência aqui — o fato é falado uma vez, na voz. */}
        <p className="text-[15px] font-semibold leading-snug text-foreground">
          {moment.text}
        </p>
      </div>
    </motion.div>
  );
}
