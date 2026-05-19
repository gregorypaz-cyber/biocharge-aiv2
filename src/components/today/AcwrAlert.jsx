import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Verifica se ACWR ficou acima de 1.30 por 2 ou mais dias consecutivos
 * usando as TrainingSessions dos últimos 28 dias.
 *
 * Não altera o cálculo existente de ACWR — usa apenas TrainingSession.strain_score
 * para replicar a lógica de ACWR local (acute/chronic ratio).
 */
function computeAcwrHistory(sessions) {
  if (!sessions || sessions.length === 0) return [];

  // Agrupar strain por data
  const strainByDate = {};
  for (const s of sessions) {
    if (!s.date || !s.strain_score) continue;
    strainByDate[s.date] = (strainByDate[s.date] || 0) + s.strain_score;
  }

  // Últimos 28 dias
  const results = [];
  const today = new Date();
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);

    // Acute: média dos últimos 7 dias a partir de `key`
    let acuteSum = 0, acuteDays = 0;
    for (let j = 0; j < 7; j++) {
      const dd = new Date(d);
      dd.setDate(d.getDate() - j);
      const dk = dd.toISOString().slice(0, 10);
      acuteSum += strainByDate[dk] || 0;
      acuteDays++;
    }
    const acute = acuteDays > 0 ? acuteSum / acuteDays : 0;

    // Chronic: média dos últimos 28 dias a partir de `key`
    let chronicSum = 0, chronicDays = 0;
    for (let j = 0; j < 28; j++) {
      const dd = new Date(d);
      dd.setDate(d.getDate() - j);
      const dk = dd.toISOString().slice(0, 10);
      chronicSum += strainByDate[dk] || 0;
      chronicDays++;
    }
    const chronic = chronicDays > 0 ? chronicSum / chronicDays : 0;

    const ratio = chronic > 0.5 ? acute / chronic : null;
    results.push({ date: key, ratio });
  }

  return results; // índice 0 = hoje, 1 = ontem, ...
}

/**
 * Retorna o alerta de ACWR consecutivo, ou null se não aplicável.
 * - level: 'warning' (>=1.30 por 2+ dias) | 'critical' (>=1.50 por 2+ dias)
 * - ratio: valor atual
 * - consecutiveDays: quantos dias consecutivos acima do threshold
 */
export function resolveAcwrAlert(acwrHistory) {
  if (!acwrHistory || acwrHistory.length < 2) return null;

  const today = acwrHistory[0];
  if (!today?.ratio) return null;

  // Contar dias consecutivos acima de 1.30 (incluindo hoje)
  let consecutiveDays = 0;
  for (const entry of acwrHistory) {
    if (entry.ratio != null && entry.ratio >= 1.30) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  if (consecutiveDays < 2) return null;

  const ratio = today.ratio;
  return {
    level: ratio >= 1.50 ? 'critical' : 'warning',
    ratio,
    consecutiveDays,
  };
}

export default function AcwrAlert({ todaySessions, allSessions, analysisRatio }) {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // Preferir analysisRatio (já calculado) para comparação de hoje,
    // mas calcular histórico via sessions para detectar consecutividade
    const sessions = allSessions || todaySessions || [];
    const history = computeAcwrHistory(sessions);

    // Sobrescrever o ratio de hoje com o do analysis engine se disponível
    if (analysisRatio != null && history.length > 0) {
      history[0] = { ...history[0], ratio: analysisRatio };
    }

    const result = resolveAcwrAlert(history);
    setAlert(result);
  }, [allSessions, todaySessions, analysisRatio]);

  if (!alert) return null;

  const isCritical = alert.level === 'critical';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 flex gap-3 ${
        isCritical
          ? 'border-red-500/50 bg-red-500/10'
          : 'border-orange-500/40 bg-orange-500/8'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isCritical
          ? <ShieldAlert className="w-4 h-4 text-red-400" />
          : <AlertTriangle className="w-4 h-4 text-orange-400" />
        }
      </div>
      <div className="space-y-0.5">
        <p className={`text-sm font-bold leading-snug ${isCritical ? 'text-red-400' : 'text-orange-400'}`}>
          {isCritical
            ? `Sua carga acumulada está em zona de risco (ACWR: ${alert.ratio.toFixed(2)}). O app recomenda fortemente descanso ou recuperação ativa hoje.`
            : `Atenção: sua carga das últimas 2 semanas está acima do ideal (ACWR: ${alert.ratio.toFixed(2)}). Reduzir a intensidade hoje diminui o risco de lesão.`
          }
        </p>
        <p className="text-[11px] text-muted-foreground">
          {alert.consecutiveDays} dias consecutivos acima do limite seguro · Opções B ou C recomendadas
        </p>
      </div>
    </motion.div>
  );
}