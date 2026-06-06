import React, { useState, useEffect } from 'react';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Minus, AlertTriangle, Dumbbell, Pencil } from 'lucide-react';
import { computeCheckinScores, getDayScore } from '@/lib/biocharge-utils';
import { parseLocalDate, formatDateShort } from '@/lib/date-utils';
import BodyStateBadge from '@/components/ui-bio/BodyStateBadge';
import WeeklyRetrospectCard from '@/components/history/WeeklyRetrospectCard';
import { useNavigate } from 'react-router-dom';

// Group checkins by week
function groupByWeek(checkins) {
  const weeks = {};
  checkins.forEach(c => {
    const d = parseLocalDate(c.date);
    if (!d) return;
    const day = d.getDay();
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - day);
    const key = weekStart.toISOString().slice(0, 10);
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(c);
  });
  return Object.entries(weeks)
    .sort((a, b) => new Date(b[0] + 'T12:00:00') - new Date(a[0] + 'T12:00:00'))
    .map(([weekStart, items]) => ({ weekStart, items }));
}

function WeekLabel({ weekStart }) {
  const d = parseLocalDate(weekStart);
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return (
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} — {end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
    </span>
  );
}

function DayDetailSheet({ checkin, sessions, onClose, onEdit }) {
  const score = getDayScore(checkin) ?? 0;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        className="bg-card border border-border rounded-3xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="overflow-y-auto p-5"
          style={{ maxHeight: '80vh', overscrollBehavior: 'contain', paddingBottom: '80px' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-black">{formatDateShort(checkin.date)}</p>
              {checkin.current_body_state && <BodyStateBadge state={checkin.current_body_state} size="sm" />}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-black font-mono text-primary">{score}</p>
                <p className="text-[10px] text-muted-foreground">prontidão</p>
              </div>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold hover:bg-secondary/80 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Sono', val: checkin.sleep_hours ? `${checkin.sleep_hours}h` : '—' },
              { label: 'Fadiga', val: checkin.fatigue ?? '—' },
              { label: 'Strain', val: checkin.daily_strain_accumulated != null ? Math.min(21, checkin.daily_strain_accumulated) : '—' },
              { label: 'HRV', val: checkin.hrv ?? '—' },
              { label: 'RHR', val: checkin.resting_hr ?? '—' },
              { label: 'Humor', val: checkin.mood ?? '—' },
            ].map(m => (
              <div key={m.label} className="rounded-xl bg-secondary p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                <p className="text-sm font-bold mt-0.5">{m.val}</p>
              </div>
            ))}
          </div>

          {sessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Treinos</p>
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{s.sport}</span>
                    <span className="text-xs text-muted-foreground">{s.duration_minutes}min</span>
                    {s.intensity && (
                      <span className="text-xs text-muted-foreground opacity-70">· {s.intensity}</span>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${(s.strain_score || 0) >= 18 ? 'text-red-400' : (s.strain_score || 0) >= 14 ? 'text-orange-400' : (s.strain_score || 0) >= 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    ⚡ strain {s.strain_score || 0}
                  </span>
                </div>
              ))}
            </div>
          )}

          {checkin.notes && (
            <div className="mt-3 p-3 rounded-xl bg-secondary">
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-sm mt-0.5">{checkin.notes}</p>
            </div>
          )}

          {checkin.next_day_forecast && (
            <div className="mt-3 p-3 rounded-xl bg-primary/8 border border-primary/15">
              <p className="text-xs text-primary font-semibold mb-1">Previsão para o dia seguinte</p>
              <p className="text-xs text-muted-foreground">{checkin.next_day_forecast}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function History() {
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const navigate = useNavigate();

  const { data: checkins = [], isLoading } = useUserCheckins(120);
  const { data: allSessions = [] } = useUserTrainingSessions(200);

  // A Timeline mostra o que REALMENTE aconteceu em cada dia — os scores que
  // foram salvos no momento do check-in — em vez de recalcular com a fórmula
  // atual. Recalcular (a) reescreveria a história, (b) divergiria do que o
  // Today mostrou no dia, e (c) o recálculo aqui era feito sem os treinos
  // (sessions vazio), gerando números inconsistentes. Usamos o valor salvo,
  // com fallback para morning_recovery_score quando recovery_score faltar.
  const computed = checkins.map((c) => ({
    ...c,
    recovery_score: getDayScore(c),
  }));
  const weeks = groupByWeek(computed);

  const toggleWeek = (key) => setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));

  // Calculate week-level trend
  const weekTrend = (items) => {
    // Considera só dias com score válido, para não diluir a média com zeros.
    const valid = items.filter((c) => c.recovery_score != null);
    if (valid.length < 2) return null;
    const sorted = [...valid].sort((a, b) => new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00'));
    const recent = sorted.slice(0, Math.ceil(sorted.length / 2));
    const older = sorted.slice(Math.ceil(sorted.length / 2));
    const recentAvg = recent.reduce((s, c) => s + c.recovery_score, 0) / recent.length;
    const olderAvg = older.reduce((s, c) => s + c.recovery_score, 0) / older.length;
    return recentAvg - olderAvg;
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black">Timeline Fisiológica</h1>
        <p className="text-sm text-muted-foreground mt-1">{computed.length} registros · agrupados por semana</p>
      </div>

      {weeks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum registro ainda.</div>
      ) : (
        weeks.map(({ weekStart, items }) => {
          const isOpen = expandedWeeks[weekStart] !== false; // default open
          const trend = weekTrend(items);
          const validItems = items.filter((c) => c.recovery_score != null);
          const weekAvg = validItems.length
            ? Math.round(validItems.reduce((s, c) => s + c.recovery_score, 0) / validItems.length)
            : 0;
          const hasAlert = items.some(c => c.current_body_state === 'Overreached' || (c.recovery_score != null && c.recovery_score < 50));
          const weekDates = new Set(items.map(c => c.date));
          const weekStrain = allSessions.filter(s => weekDates.has(s.date)).reduce((acc, t) => acc + (t.strain_score || 0), 0);

          return (
            <motion.div
              key={weekStart}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              {/* Week header */}
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                onClick={() => toggleWeek(weekStart)}
              >
                <div className="flex items-center gap-3">
                  <WeekLabel weekStart={weekStart} />
                  {hasAlert && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">avg {weekAvg}</span>
                  {weekStrain > 0 && (
                    <span className="text-xs text-muted-foreground">⚡ {Math.round(weekStrain)} strain</span>
                  )}
                  <span className="text-xs text-muted-foreground">{items.length}d</span>
                  {trend !== null && (
                    trend > 3 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                    trend < -3 ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Weekly Retrospect Card */}
              {isOpen && (
                <WeeklyRetrospectCard
                  weekStart={weekStart}
                  weekEnd={(() => { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); })()}
                  checkins={items}
                  sessions={allSessions.filter(s => weekDates.has(s.date))}
                />
              )}

              {/* Days */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border divide-y divide-border/50">
                      {[...items]
                        .sort((a, b) => new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00'))
                        .map((c, i) => {
                          const sessions = allSessions.filter(s => s.date === c.date);
                          const rawScore = getDayScore(c);
                          const hasScore = rawScore != null;
                          const score = hasScore ? rawScore : 0;
                          const isAlert = c.current_body_state === 'Overreached' || (hasScore && rawScore < 50);

                          return (
                            <motion.button
                              key={c.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.03 }}
                              onClick={() => setSelectedCheckin(c)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
                            >
                              {/* Date */}
                              <div className="w-10 text-center shrink-0">
                                <p className="text-xs text-muted-foreground">
                                  {parseLocalDate(c.date)?.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                </p>
                                <p className="text-sm font-bold">{parseLocalDate(c.date)?.getDate()}</p>
                              </div>

                              {/* Score */}
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0"
                                style={{
                                  background: !hasScore ? 'rgba(148,163,184,0.12)' : isAlert ? 'rgba(220,38,38,0.15)' : score >= 80 ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                                  color: !hasScore ? '#94a3b8' : isAlert ? '#ef4444' : score >= 80 ? '#22c55e' : '#eab308'
                                }}
                              >
                                {hasScore ? score : '—'}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {c.current_body_state ? (
                                    <BodyStateBadge state={c.current_body_state} size="sm" />
                                  ) : c.rest_day ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">🛌 Descanso</span>
                                  ) : null}
                                </div>
                                <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                                  {sessions.length > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <Dumbbell className="w-3 h-3" /> {sessions.length} treino{sessions.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {c.daily_strain_accumulated > 0 && (() => {
                                const displayStrain = Math.min(21, c.daily_strain_accumulated);
                                return (
                                <span className={`${displayStrain >= 18 ? 'text-red-400' : displayStrain >= 14 ? 'text-orange-400' : displayStrain >= 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                ⚡ strain {displayStrain}
                                </span>
                                );
                                })()}
                                </div>
                                {c.notes && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px] italic">
                                    "{c.notes.slice(0, 40)}{c.notes.length > 40 ? '...' : ''}"
                                  </p>
                                )}
                              </div>

                              {/* Trend arrow */}
                              <div className="shrink-0">
                                {i < items.length - 1 ? (
                                  score > (items[i + 1]?.recovery_score || 0) + 3
                                    ? <TrendingUp className="w-4 h-4 text-emerald-400" title="Prontidão subindo" />
                                    : score < (items[i + 1]?.recovery_score || 0) - 3
                                    ? <TrendingDown className="w-4 h-4 text-red-400" title="Prontidão caindo" />
                                    : <Minus className="w-4 h-4 text-muted-foreground" title="Prontidão estável" />
                                ) : null}
                              </div>
                            </motion.button>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
      )}

      {/* Day Detail Sheet */}
      <AnimatePresence>
        {selectedCheckin && (
          <DayDetailSheet
            checkin={selectedCheckin}
            sessions={allSessions.filter(s => s.date === selectedCheckin.date)}
            onClose={() => setSelectedCheckin(null)}
            onEdit={() => {
              setSelectedCheckin(null);
              navigate('/checkin', { state: { editData: selectedCheckin } });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}