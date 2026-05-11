import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const TYPE_CONFIG = {
  red: { icon: AlertCircle, bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400', icon_color: 'text-red-400' },
  orange: { icon: AlertTriangle, bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-400', icon_color: 'text-orange-400' },
  blue: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/25', text: 'text-blue-400', icon_color: 'text-blue-400' },
};

export default function OvertainingAlerts({ alerts }) {
  const [dismissed, setDismissed] = useState([]);

  const visible = alerts.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visible.map(alert => {
          const cfg = TYPE_CONFIG[alert.type] || TYPE_CONFIG.blue;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 ${cfg.bg} ${cfg.border}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.icon_color}`} />
              <p className={`text-sm flex-1 leading-relaxed ${cfg.text}`}>{alert.message}</p>
              <button
                onClick={() => setDismissed(prev => [...prev, alert.id])}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}