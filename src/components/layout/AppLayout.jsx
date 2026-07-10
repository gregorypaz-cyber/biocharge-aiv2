import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Plus, Brain, Clock, Activity, Settings, TrendingUp, Sparkles, ShieldCheck, Compass, Dumbbell, Watch, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { WEARABLES } from '@/pages/AppSettings';

const navItems = [
  { path: '/today', icon: Activity, label: 'Hoje' },
  { path: '/insights', icon: Brain, label: 'Padrões' },
  { path: '/checkin', icon: Plus, label: 'Check-in', primary: true },
  { path: '/trends', icon: TrendingUp, label: 'Tendências' },
  { path: '/history', icon: Clock, label: 'Histórico' },
];

const ONBOARDING_STEPS = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao Reck',
    body: 'Reck vem de reckoning — um acerto de contas honesto com o seu corpo, todos os dias. Seu painel pessoal de prontidão: sono, recuperação e carga de treino calculados a partir do seu sinal bruto, não de uma fórmula genérica de mercado.',
  },
  {
    icon: ShieldCheck,
    title: 'Números honestos, não bonitos',
    body: 'Você vai ver vermelho quando for vermelho. Nenhum score aqui é inflado pra parecer bonito — cada número vem de sinal bruto (HRV, FC de repouso, sono). Se um dia parecer "duro demais", é porque tá calibrado pra te desafiar a melhorar, não pra te agradar.',
  },
  {
    icon: Compass,
    title: 'As 5 telas',
    body: null,
    items: [
      { label: 'Hoje', desc: 'a decisão do dia' },
      { label: 'Padrões', desc: 'o que explica suas variações' },
      { label: 'Check-in', desc: 'seu registro diário' },
      { label: 'Tendências', desc: 'evolução ao longo do tempo' },
      { label: 'Histórico', desc: 'dia a dia, sem filtro' },
    ],
  },
  {
    icon: Dumbbell,
    title: 'O que o Reck não faz',
    body: 'Não prescreve treino — isso é com o seu plano. O Reck te diz como seu corpo tá, não o que treinar hoje. E nos primeiros dias o score pode ficar em branco: é calibração, não bug.',
  },
];

function OnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [wearable, setWearable] = useState(user?.preferences?.wearable_profile || 'zepp');
  const [saving, setSaving] = useState(false);
  const totalSteps = ONBOARDING_STEPS.length + 1;
  const isWearableStep = step === ONBOARDING_STEPS.length;

  const finish = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        preferences: { ...user?.preferences, onboarding_completed: true, wearable_profile: wearable },
      });
    } catch (err) {
      console.error('onboarding save failed', err);
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-6 py-10">
        <div className="flex items-center gap-1.5 mb-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-border')}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!isWearableStep ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              {(() => {
                const s = ONBOARDING_STEPS[step];
                const Icon = s.icon;
                return (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight mb-3">{s.title}</h1>
                    {s.body && <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>}
                    {s.items && (
                      <div className="space-y-2 mt-2">
                        {s.items.map(it => (
                          <div key={it.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                            <span className="text-sm font-semibold text-foreground w-24 shrink-0">{it.label}</span>
                            <span className="text-xs text-muted-foreground">{it.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div
              key="wearable"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Watch className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-foreground tracking-tight mb-3">Seu wearable</h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Define os rótulos e os campos do check-in. O app guarda só sinais crus, então a fórmula não muda — muda o que você vê e preenche.
              </p>
              <div className="space-y-2">
                {WEARABLES.map(w => (
                  <button
                    key={w.value}
                    onClick={() => setWearable(w.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left ${
                      wearable === w.value ? 'border-primary/50 bg-primary/10' : 'border-border bg-secondary hover:border-border/80'
                    }`}
                  >
                    <span className="text-2xl">{w.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold">{w.label}</p>
                      <p className="text-xs text-muted-foreground">{w.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-amber-300/90 leading-relaxed mt-3">
                ⚠️ Dá pra trocar depois em Configurações — mas trocar de wearable no meio contamina seu histórico de HRV.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8 pt-4">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2">
              Voltar
            </button>
          ) : <span />}

          {!isWearableStep ? (
            <div className="flex items-center gap-4">
              <button onClick={() => setStep(ONBOARDING_STEPS.length)} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2">
                Pular tour
              </button>
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1 bg-primary text-primary-foreground font-semibold text-sm px-5 py-2.5 rounded-xl"
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="bg-primary text-primary-foreground font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Concluir'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const needsOnboarding =
    user &&
    !onboardingDismissed &&
    !user?.preferences?.onboarding_completed &&
    !user?.preferences?.wearable_profile;

  if (needsOnboarding) {
    return <OnboardingWizard user={user} onComplete={() => setOnboardingDismissed(true)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/today" className="flex items-center gap-2">
            <svg viewBox="0 0 96 96" className="w-7 h-7" role="img" aria-label="Reck">
              <defs>
                <radialGradient id="reckGem" cx="34%" cy="22%" r="88%">
                  <stop offset="0%" stopColor="hsl(142 62% 74%)" />
                  <stop offset="30%" stopColor="hsl(142 70% 46%)" />
                  <stop offset="74%" stopColor="hsl(146 78% 26%)" />
                  <stop offset="100%" stopColor="hsl(150 80% 15%)" />
                </radialGradient>
                <radialGradient id="reckSpec" cx="30%" cy="18%" r="13%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <filter id="reckHalo" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.8" />
                </filter>
              </defs>
              <path d="M48 6 C68 5 90 20 90 46 C90 72 72 91 47 90 C23 89 6 73 6 48 C6 22 27 7 48 6 Z" fill="url(#reckGem)" />
              <path d="M48 6 C68 5 90 20 90 46 C90 72 72 91 47 90 C23 89 6 73 6 48 C6 22 27 7 48 6 Z" fill="url(#reckSpec)" />
              <g transform="translate(32.55 64) scale(0.02344 -0.02344)" filter="url(#reckHalo)">
                <path d="M180 0L180 1490L690 1490Q864 1490 976.5 1430.5Q1089 1371 1143.5 1267Q1198 1163 1198 1030Q1198 897 1143.5 795Q1089 693 977 635.5Q865 578 691 578L286 578L286 682L680 682Q810 682 897.5 726Q985 770 1027.5 848Q1070 926 1070 1030Q1070 1134 1027 1215Q984 1296 895.5 1341Q807 1386 676 1386L286 1386L286 0L180 0ZM888 674L1256 0L1132 0L766 674L888 674Z" fill="hsl(152 80% 12%)" opacity="0.85" transform="translate(0 -94)" />
              </g>
              <g transform="translate(32.55 64) scale(0.02344 -0.02344)">
                <path d="M180 0L180 1490L690 1490Q864 1490 976.5 1430.5Q1089 1371 1143.5 1267Q1198 1163 1198 1030Q1198 897 1143.5 795Q1089 693 977 635.5Q865 578 691 578L286 578L286 682L680 682Q810 682 897.5 726Q985 770 1027.5 848Q1070 926 1070 1030Q1070 1134 1027 1215Q984 1296 895.5 1341Q807 1386 676 1386L286 1386L286 0L180 0ZM888 674L1256 0L1132 0L766 674L888 674Z" fill="#f2fff7" />
              </g>
            </svg>
            <span className="font-black text-foreground tracking-tight text-sm">Reck</span>
          </Link>
          <Link
            to="/settings"
            className={cn(
              'p-2 rounded-lg transition-colors',
              location.pathname === '/settings' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-32 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/75 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto grid grid-cols-5 items-center h-16 px-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 h-full transition-all relative',
                  item.primary
                    ? ''
                    : isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && !item.primary && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute inset-1 bg-primary/8 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                {item.primary ? (
                  <div
                    className="w-14 h-14 -mt-6 relative flex items-center justify-center"
                    style={{ filter: 'drop-shadow(0 4px 14px hsl(142 70% 50% / 0.35))' }}
                  >
                    <svg viewBox="0 0 96 96" className="absolute inset-0 w-full h-full" aria-hidden="true">
                      <defs>
                        <radialGradient id="fabGem" cx="42%" cy="30%" r="85%">
                          <stop offset="0%" stopColor="hsl(142 60% 70%)" />
                          <stop offset="36%" stopColor="hsl(142 70% 44%)" />
                          <stop offset="80%" stopColor="hsl(148 80% 22%)" />
                          <stop offset="100%" stopColor="hsl(152 82% 14%)" />
                        </radialGradient>
                        <radialGradient id="fabSpec" cx="34%" cy="22%" r="16%">
                          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
                          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <path d="M48 7 C67 6 89 21 89 46 C89 71 71 90 47 89 C24 88 7 72 7 48 C7 23 27 8 48 7 Z" fill="url(#fabGem)" />
                      <path d="M48 7 C67 6 89 21 89 46 C89 71 71 90 47 89 C24 88 7 72 7 48 C7 23 27 8 48 7 Z" fill="url(#fabSpec)" />
                    </svg>
                    <item.icon className="w-6 h-6 relative" strokeWidth={2.5} style={{ color: '#eafff2' }} />
                  </div>
                ) : (
                  <item.icon className="w-5 h-5 relative" />
                )}
                {!item.primary && (
                  <span className="text-[10px] font-semibold relative whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
