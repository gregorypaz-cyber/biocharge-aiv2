import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Plus, Brain, Clock, Activity, Settings, TrendingUp, Sparkles, ShieldCheck, Compass, Dumbbell, Watch, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { WEARABLES } from '@/pages/AppSettings';
import { duration, easing, spring } from '@/lib/motion-tokens';

const pageTitles = {
  '/today':    'Hoje',
  '/insights': 'Padrões',
  '/checkin':  'Check-in',
  '/trends':   'Tendências',
  '/history':  'Histórico',
  '/settings': 'Configurações',
};

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
              <p className="text-support text-health-amber/60/90 leading-relaxed mt-3">
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
  const reduce = useReducedMotion();

  const needsOnboarding =
    user &&
    !onboardingDismissed &&
    !user?.preferences?.onboarding_completed &&
    !user?.preferences?.wearable_profile;

  if (needsOnboarding) {
    return <OnboardingWizard user={user} onComplete={() => setOnboardingDismissed(true)} />;
  }

  const pageTitle = pageTitles[location.pathname] ?? '';
  const pageTransition = reduce
    ? { duration: 0 }
    : { duration: duration.base / 1000, ease: easing.out };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header — logo symbol + page title crossfade + settings */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo: symbol only */}
          <Link to="/today" aria-label="Reck — página inicial" className="shrink-0">
            <svg viewBox="0 0 120 120" className="w-7 h-7" role="img" aria-label="Reck">
              <circle cx="60" cy="60" r="42" fill="none" stroke="hsl(142 70% 50%)" strokeWidth="13" />
              <g fill="none" stroke="hsl(210 40% 96%)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
                <path d="M51 41 V79" />
                <path d="M51 41 H62 a10.5 10.5 0 0 1 0 21 H51" />
                <path d="M56 62 L70 79" />
              </g>
            </svg>
          </Link>

          {/* Page title — crossfade on route change */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={pageTitle}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? {} : { opacity: 0, y: -4 }}
              transition={pageTransition}
              className="text-sm font-semibold text-foreground tracking-tight absolute left-1/2 -translate-x-1/2"
            >
              {pageTitle}
            </motion.p>
          </AnimatePresence>

          <Link
            to="/settings"
            className={cn(
              'p-2 rounded-lg transition-colors shrink-0',
              location.pathname === '/settings' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Content — page transition on route change */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-32 overflow-y-auto">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? {} : { opacity: 0 }}
            transition={pageTransition}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-2xl mx-auto grid grid-cols-5 items-center h-16 px-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 min-h-[44px] h-full transition-colors relative',
                  item.primary
                    ? ''
                    : isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && !item.primary && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute inset-1 bg-primary/8 rounded-xl"
                    transition={spring.default}
                  />
                )}
                {item.primary ? (
                  <motion.div
                    whileTap={reduce ? undefined : { scale: 0.92 }}
                    transition={{ duration: duration.fast / 1000 }}
                    className="w-12 h-12 -mt-5 rounded-full bg-zone-green flex items-center justify-center shadow-lg shadow-zone-green/30 ring-4 ring-background relative"
                  >
                    <item.icon className="w-[22px] h-[22px] text-primary-foreground" />
                  </motion.div>
                ) : (
                  <item.icon className="w-[22px] h-[22px] relative" />
                )}
                <span
                  className={cn(
                    'text-micro font-semibold relative whitespace-nowrap',
                    item.primary ? 'text-muted-foreground' : ''
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
