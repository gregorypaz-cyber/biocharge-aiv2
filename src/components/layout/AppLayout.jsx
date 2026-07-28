import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Settings, Sparkles, ShieldCheck, Compass, Dumbbell, Watch, ChevronRight } from 'lucide-react';
import MeniscusNav from '@/components/layout/MeniscusNav';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { WEARABLES } from '@/pages/AppSettings';



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
                    <h1 className="text-[28px] leading-[1.15] font-semibold text-foreground tracking-[-0.025em] mb-3">{s.title}</h1>
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
              <h1 className="text-[28px] leading-[1.15] font-semibold text-foreground tracking-[-0.025em] mb-3">Seu wearable</h1>
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
              <p className="t-micro text-amber-300/90 leading-relaxed mt-3">
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
      <header className="sticky top-0 z-50 border-b border-border/40 glass-bar-strong">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/today" className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-7 h-7" role="img" aria-label="Reck">
              <defs>
                <linearGradient id="reckTile" x1="0" y1="0" x2="0.35" y2="1">
                  <stop offset="0" stopColor="#3BE785" />
                  <stop offset="0.52" stopColor="#26D968" />
                  <stop offset="1" stopColor="#0C8B4C" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="23" fill="url(#reckTile)" />
              <g transform="translate(15.5 15.5) scale(0.69)" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
                <path d="M30 22 V78" />
                <path d="M30 22 H53 A14 14 0 0 1 53 50 H30" />
                <path d="M44 50 L58 78 L70 55" />
              </g>
            </svg>
            <span className="text-[15px] font-bold text-foreground tracking-[-0.02em]">Reck</span>
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
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-44 overflow-y-auto">
        <Outlet />
      </main>

      {/* Dissolve de borda: o conteúdo derrete no fundo antes de encostar na nav */}
      <div className="scroll-edge-bottom" aria-hidden="true" />

      {/* Mobile bottom nav */}
      <MeniscusNav />
    </div>
  );
}