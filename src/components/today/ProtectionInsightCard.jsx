import { motion } from 'framer-motion';
import { ShieldCheck, Moon, ArrowDownCircle } from 'lucide-react';

function getVariantConfig(variant) {
  const configs = {
    protection: {
      border: 'border-domain-sleep/20',
      bg: 'bg-domain-sleep/5',
      title: 'text-domain-sleep',
      icon: 'text-domain-sleep',
      chip: 'bg-domain-sleep/15 text-domain-sleep',
      label: 'Proteção',
      helper: 'Hoje o melhor retorno vem de reduzir carga e preservar recuperação.',
      helperIcon: Moon,
    },
    warning: {
      border: 'border-domain-strain/25',
      bg: 'bg-domain-strain/5',
      title: 'text-domain-strain',
      icon: 'text-domain-strain',
      chip: 'bg-domain-strain/15 text-domain-strain',
      label: 'Atenção',
      helper: 'Hoje vale reduzir a dose e evitar transformar esforço útil em excesso.',
      helperIcon: ArrowDownCircle,
    },
    info: {
      border: 'border-border/50',
      bg: 'bg-secondary/40',
      title: 'text-foreground',
      icon: 'text-muted-foreground',
      chip: 'bg-secondary text-foreground/80',
      label: 'Info',
      helper: 'Use esta recomendação como ajuste prático para o restante do dia.',
      helperIcon: ShieldCheck,
    },
  };

  return configs[variant] ?? configs.info;
}

export default function ProtectionInsightCard({ mutation }) {
  if (!mutation) return null;

  const s = getVariantConfig(mutation.variant);
  const HelperIcon = s.helperIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 space-y-4 ${s.border} ${s.bg}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {mutation.icon ? (
            <span className="text-xl leading-none">{mutation.icon}</span>
          ) : (
            <ShieldCheck className={`w-5 h-5 ${s.icon}`} />
          )}

          <span className={`text-micro font-bold px-2 py-0.5 rounded-full ${s.chip}`}>
            {s.label}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-1.5">
        <p className={`text-sm font-semibold ${s.title}`}>
          {mutation.title}
        </p>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {mutation.body}
        </p>
      </div>

      {/* Helper block */}
      <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <HelperIcon className={`w-4 h-4 mt-0.5 shrink-0 ${s.icon}`} />
          <div>
            <p className="text-micro text-muted-foreground mb-1">
              O que fazer agora
            </p>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {s.helper}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}