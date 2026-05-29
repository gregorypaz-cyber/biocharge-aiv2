import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

/**
 * Formata uma data local no padrão YYYY-MM-DD.
 * Evita o uso de toISOString(), que pode deslocar a data por causa de UTC.
 */
function formatLocalDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calcula histórico local de ACWR usando TrainingSessions.
 *
 * Observação:
 * - Este cálculo é usado apenas para detectar consecutividade.
 * - O ratio de hoje pode ser substituído por analysisRatio vindo da engine principal.
 * - Não altera o cálculo oficial do app.
 */
function computeAcwrHistory(sessions) {
  if (!sessions || sessions.length === 0) return [];

  const strainByDate = {};

  for (const session of sessions) {
    if (!session.date || session.strain_score == null) continue;

    strainByDate[session.date] =
      (strainByDate[session.date] || 0) + session.strain_score;
  }

  const results = [];
  const today = new Date();

  for (let i = 0; i < 28; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - i);

    const key = formatLocalDate(currentDate);

    let acuteSum = 0;
    let acuteDays = 0;

    for (let j = 0; j < 7; j++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - j);

      const dateKey = formatLocalDate(date);

      acuteSum += strainByDate[dateKey] || 0;
      acuteDays += 1;
    }

    const acute = acuteDays > 0 ? acuteSum / acuteDays : 0;

    let chronicSum = 0;
    let chronicDays = 0;

    for (let j = 0; j < 28; j++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - j);

      const dateKey = formatLocalDate(date);

      chronicSum += strainByDate[dateKey] || 0;
      chronicDays += 1;
    }

    const chronic = chronicDays > 0 ? chronicSum / chronicDays : 0;
    const ratio = chronic > 0.5 ? acute / chronic : null;

    results.push({
      date: key,
      ratio,
    });
  }

  return results;
}

/**
 * Retorna o alerta de ACWR consecutivo, ou null se não aplicável.
 *
 * level:
 * - warning: >= 1.30 por 2+ dias
 * - critical: >= 1.50 hoje, com 2+ dias acima de 1.30
 */
export function resolveAcwrAlert(acwrHistory) {
  if (!acwrHistory || acwrHistory.length < 2) return null;

  const today = acwrHistory[0];
  if (today?.ratio == null) return null;

  let consecutiveDays = 0;

  for (const entry of acwrHistory) {
    if (entry.ratio != null && entry.ratio >= 1.3) {
      consecutiveDays += 1;
    } else {
      break;
    }
  }

  if (consecutiveDays < 2) return null;

  const ratio = today.ratio;

  return {
    level: ratio >= 1.5 ? 'critical' : 'warning',
    ratio,
    consecutiveDays,
  };
}

function buildAlertCopy(alert) {
  const isCritical = alert.level === 'critical';

  if (isCritical) {
    return {
      title: `Carga recente muito alta — ACWR ${alert.ratio.toFixed(2)}`,
      body: 'Seu volume recente está acima da zona ideal. Hoje faz mais sentido proteger recuperação do que adicionar intensidade.',
      footer: `${alert.consecutiveDays} dias seguidos acima do limite de controle · prefira recuperação ou opção C.`,
    };
  }

  return {
    title: `Carga recente acima do ideal — ACWR ${alert.ratio.toFixed(2)}`,
    body: 'Sua carga está elevada por mais de um dia seguido. Reduzir a dose hoje ajuda a evitar fadiga acumulada nos próximos dias.',
    footer: `${alert.consecutiveDays} dias seguidos acima da zona de controle · opções B ou C fazem mais sentido.`,
  };
}

export default function AcwrAlert({ todaySessions, allSessions, analysisRatio }) {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const sessions = allSessions || todaySessions || [];
    const history = computeAcwrHistory(sessions);

    if (analysisRatio != null && history.length > 0) {
      history[0] = {
        ...history[0],
        ratio: analysisRatio,
      };
    }

    const result = resolveAcwrAlert(history);
    setAlert(result);
  }, [allSessions, todaySessions, analysisRatio]);

  if (!alert) return null;

  const isCritical = alert.level === 'critical';
  const copy = buildAlertCopy(alert);

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
        {isCritical ? (
          <ShieldAlert className="w-4 h-4 text-red-400" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-orange-400" />
        )}
      </div>

      <div className="space-y-1">
        <p
          className={`text-sm font-bold leading-snug ${
            isCritical ? 'text-red-400' : 'text-orange-400'
          }`}
        >
          {copy.title}
        </p>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {copy.body}
        </p>

        <p className="text-[11px] text-muted-foreground">
          {copy.footer}
        </p>
      </div>
    </motion.div>
  );
}