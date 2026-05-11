import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { getBioChargeScoreInfo, getBioChargeDayPhrase } from '@/lib/biocharge-utils';

export default function BioChargeScoreCard({ score, checkin }) {
  if (!checkin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border/60 bg-card p-8 text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-black mb-2">Nenhum check-in hoje</h2>
        <p className="text-sm text-muted-foreground mb-6">Registre seus dados para ativar o BioCharge Score</p>
        <Link
          to="/checkin"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all hover:scale-105 text-sm"
        >
          <ClipboardList className="w-4 h-4" /> 📋 Fazer Checkin Agora
        </Link>
      </motion.div>
    );
  }

  const info = getBioChargeScoreInfo(score);
  const phrase = getBioChargeDayPhrase(checkin, score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border p-6 text-center relative overflow-hidden"
      style={{ borderColor: info.color + '33', background: `radial-gradient(ellipse at 50% 0%, ${info.color}10 0%, transparent 70%), hsl(220,18%,7%)` }}
    >
      {/* Glow */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: `inset 0 0 40px ${info.color}08` }} />

      {/* Score */}
      <div className="relative">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">BioCharge Score</p>
        <p
          className="text-8xl font-black font-mono leading-none mb-3"
          style={{ color: info.color }}
        >
          {score}
        </p>

        {/* Badge */}
        <div
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold mb-4"
          style={{ background: info.color + '18', color: info.color, border: `1px solid ${info.color}30` }}
        >
          <span>{info.emoji}</span>
          <span>{info.description}</span>
        </div>

        {/* Phrase */}
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{phrase}</p>
      </div>
    </motion.div>
  );
}