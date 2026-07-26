import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins } from '@/hooks/useUserData';
import { buildBaseline } from '@/lib/physiological-engine';
import { assessHealthSignals } from '@/lib/physiological-engine';
import { getTodayLocal } from '@/lib/date-utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortDesc(checkins) {
  return [...(checkins || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function stateLabel(state) {
  if (state === 'normal') return 'Normal';
  if (state === 'acute') return 'Alterado';
  if (state === 'sustained') return 'Alterado (2º dia)';
  return 'Calibrando';
}

function stateColor(state) {
  if (state === 'normal') return 'text-emerald-400';
  if (state === 'acute') return 'text-amber-400';
  if (state === 'sustained') return 'text-red-400';
  return 'text-muted-foreground';
}

function stateBorderBg(state) {
  if (state === 'normal') return 'border-emerald-500/30 bg-emerald-500/6';
  if (state === 'acute') return 'border-amber-500/30 bg-amber-500/6';
  if (state === 'sustained') return 'border-red-500/30 bg-red-500/6';
  return 'border-border/40 bg-secondary/20';
}

function directionArrow(direction) {
  if (direction === 'good') return { symbol: '↓', color: 'text-emerald-400' };
  if (direction === 'bad')  return { symbol: '↑', color: 'text-red-400' };
  return { symbol: '—', color: 'text-muted-foreground' };
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function SectionHeader({ children }) {
  return (
    <p className="t-micro font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">
      {children}
    </p>
  );
}

function VerdictSection({ state, today }) {
  return (
    <div className={`rounded-2xl border p-4 ${stateBorderBg(state)}`}>
      <p className="t-micro text-muted-foreground uppercase tracking-wider font-semibold mb-1">
        Hoje · {fmtDate(today)}
      </p>
      <p className={`text-2xl font-semibold ${stateColor(state)}`}>
        {stateLabel(state)}
      </p>
      {state === 'normal' && (
        <p className="text-xs text-muted-foreground mt-1">
          Todos os sinais monitorados dentro do teu padrão pessoal.
        </p>
      )}
      {state === 'acute' && (
        <p className="text-xs text-muted-foreground mt-1">
          2 ou mais sinais fora do padrão hoje. Se repetir amanhã, classifico como sustentado.
        </p>
      )}
      {state === 'sustained' && (
        <p className="text-xs text-muted-foreground mt-1">
          2 ou mais sinais fora do padrão por 2 dias consecutivos.
        </p>
      )}
    </div>
  );
}

function VitalsPanel({ flags }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      {flags.map((f, i) => {
        const isPending = f.status === 'pending';
        const arrow = directionArrow(f.direction);
        return (
          <div
            key={f.id}
            className={`flex items-center justify-between px-4 py-3 ${
              i < flags.length - 1 ? 'border-b border-border/30' : ''
            } ${isPending ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center gap-2">
              {f.raised && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              )}
              {!f.raised && !isPending && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 shrink-0" />
              )}
              {isPending && (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium leading-tight">
                  {f.label}
                  {isPending && (
                    <span className="ml-1.5 t-micro text-muted-foreground font-normal">
                      em breve (anel)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              {isPending ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold">
                      {f.today ?? '—'}
                    </p>
                    {f.baseline != null && (
                      <p className="t-micro text-muted-foreground">
                        base {f.baseline}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${arrow.color}`}>
                    {arrow.symbol}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveFlagsSection({ flags }) {
  const raised = flags.filter((f) => f.raised);
  if (raised.length === 0) return null;

  const parts = raised.map((f) => {
    if (f.id === 'hrv' && f.deltaPct != null) return `HRV ${Math.abs(f.deltaPct)}% abaixo`;
    if (f.id === 'rhr' && f.deltaPct != null) return `FC ${Math.abs(f.deltaPct)}% acima`;
    return f.label;
  });

  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 space-y-2">
      <p className="text-sm font-semibold text-red-400">Flags ativas</p>
      <p className="text-sm text-muted-foreground">{parts.join(' · ')}</p>
      <p className="t-micro text-muted-foreground/70 leading-relaxed">
        Preciso de 2+ sinais juntos pra alertar — 1 sinal isolado é ruído.
      </p>
    </div>
  );
}

function HistorySection({ history }) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-secondary/20 px-4 py-4">
        <p className="text-sm text-muted-foreground">Nenhum desvio registrado.</p>
      </div>
    );
  }

  // Group consecutive deviation days visually
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      {history.map((entry, i) => {
        const isFirst = i === 0;
        const prevEntry = history[i - 1];
        // Check if this day is part of a consecutive cluster with the previous entry
        const isCluster =
          !isFirst &&
          (() => {
            const prev = new Date(prevEntry.date + 'T00:00:00');
            const cur = new Date(entry.date + 'T00:00:00');
            const diff = Math.round((prev - cur) / 86400000);
            return diff === 1;
          })();

        return (
          <div
            key={entry.date}
            className={`flex items-center justify-between px-4 py-3 ${
              i < history.length - 1 ? 'border-b border-border/30' : ''
            } ${isCluster ? 'bg-secondary/20' : ''}`}
          >
            <div className="flex items-center gap-2">
              {isCluster && (
                <span className="text-muted-foreground/40 text-xs font-mono mr-1">└</span>
              )}
              <Clock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <span className="text-sm">{fmtDate(entry.date)}</span>
            </div>
            <span
              className={`text-xs font-semibold ${
                entry.state === 'sustained' ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {entry.state === 'sustained' ? 'Sustentado' : 'Agudo'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HonestyFooter() {
  return (
    <div className="rounded-2xl border border-border/30 bg-secondary/20 px-4 py-4">
      <p className="t-micro text-muted-foreground leading-relaxed">
        Isto não é diagnóstico médico. O monitor compara teus sinais ao teu próprio padrão e só fala quando 2 ou mais desviam juntos — o silêncio é intencional. Em caso de sintomas, procure um profissional de saúde.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Health() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rawCheckins } = useUserCheckins(90);

  const checkins = useMemo(() => sortDesc(rawCheckins || []), [rawCheckins]);
  const baseline = useMemo(() => buildBaseline(checkins), [checkins]);
  const healthSignals = useMemo(() => assessHealthSignals(checkins, baseline), [checkins, baseline]);

  const today = getTodayLocal();

  if (!healthSignals || healthSignals.state === 'calibrating') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
          <div className="rounded-2xl border border-border/40 bg-secondary/20 p-4">
            <p className="text-sm font-semibold text-muted-foreground">Calibrando</p>
            <p className="text-xs text-muted-foreground mt-1">
              O monitor precisa de pelo menos 7 noites de HRV para começar a avaliar. Continue registrando os check-ins.
            </p>
          </div>
          <HonestyFooter />
        </div>
      </div>
    );
  }

  const { state, flags, flagCount, history } = healthSignals;
  const showFlags = state === 'acute' || state === 'sustained';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-12">

        {/* Header */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Monitor de Saúde</h1>
        </div>

        {/* A · Veredito */}
        <VerdictSection state={state} today={today} />

        {/* B · Painel de Vitais */}
        <div>
          <SectionHeader>Sinais vs. teu baseline</SectionHeader>
          <VitalsPanel flags={flags} />
        </div>

        {/* C · Flags ativas (só se acute | sustained) */}
        {showFlags && (
          <div>
            <SectionHeader>Flags ativas</SectionHeader>
            <ActiveFlagsSection flags={flags} />
          </div>
        )}

        {/* D · Histórico de desvios */}
        <div>
          <SectionHeader>Histórico de desvios</SectionHeader>
          <HistorySection history={history} />
        </div>

        {/* E · Rodapé de honestidade (sempre visível) */}
        <HonestyFooter />
      </div>
    </div>
  );
}
