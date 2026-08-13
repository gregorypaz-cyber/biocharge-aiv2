import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, LogOut, Globe, Dumbbell, Clock, Target, Plus, X, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import CoachProviderSettings from '@/components/settings/CoachProviderSettings';

const COMMON_SPORTS = ['Corrida', 'Musculação', 'Ciclismo', 'Natação', 'Futsal', 'Futebol', 'Jiu-jitsu', 'CrossFit', 'HIIT', 'Yoga', 'Caminhada', 'Boxe', 'Basquete', 'Pilates'];

const TRAINING_TIMES = [
  { value: 'morning', label: 'Manhã', emoji: '🌅' },
  { value: 'afternoon', label: 'Tarde', emoji: '☀️' },
  { value: 'evening', label: 'Noite', emoji: '🌆' },
  { value: 'night', label: 'Madrugada', emoji: '🌙' },
];

const RECOVERY_GOALS = [
  { value: 'performance', label: 'Alta Performance', desc: 'Maximizar resultados e PR', emoji: '🏆' },
  { value: 'health', label: 'Saúde Geral', desc: 'Equilíbrio e longevidade', emoji: '💚' },
  { value: 'rehab', label: 'Reabilitação', desc: 'Recuperação de lesão', emoji: '🩺' },
];

const EXPERIENCE_LEVELS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

const GUIDANCE_GOALS = [
  { value: 'performance', label: 'Render mais', desc: 'Priorizar performance e evolução' },
  { value: 'consistencia', label: 'Consistência', desc: 'Treinar com regularidade e sustentabilidade' },
  { value: 'recuperacao', label: 'Recuperar melhor', desc: 'Melhorar sono, absorção de carga e margem diária' },
];

export const WEARABLES = [
  { value: 'zepp', label: 'Amazfit / Zepp', desc: 'HRV em rMSSD · tem Pontuação de Sono', emoji: '⌚' },
  { value: 'apple', label: 'Apple Watch', desc: 'HRV em SDNN · sem score de sono (usa sinais crus)', emoji: '🍎' },
];

export default function AppSettings() {
  const { user, checkUserAuth } = useAuth();
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [prefs, setPrefs] = useState({
    timezone: detectedTz,
    sports: [],
    primary_sport: '',
    experience_level: '',
    guidance_goal: 'consistencia',
    training_times: [],
    recovery_goal: 'health',
    max_hr: 185,
    wearable_profile: 'zepp',
    // Perfil físico (usado na Vitalidade / tendência de longevidade / VO2max)
    birth_year: '',
    sex: '',
    height_cm: '',
    waist_cm: '',
    vo2max_manual: '',
  });
  const [customSport, setCustomSport] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // { faltando, total, arquivo }
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.preferences) {
      setPrefs(p => ({ ...p, ...user.preferences }));
    }
  }, [user]);

  const toggleSport = (sport) => {
    setPrefs((p) => {
      const exists = p.sports.includes(sport);
      const nextSports = exists
        ? p.sports.filter((s) => s !== sport)
        : [...p.sports, sport];

      return {
        ...p,
        sports: nextSports,
        primary_sport: exists && p.primary_sport === sport ? '' : p.primary_sport,
      };
    });
  };

  const addCustomSport = () => {
    if (!customSport.trim()) return;
    if (!prefs.sports.includes(customSport.trim())) {
      setPrefs(p => ({ ...p, sports: [...p.sports, customSport.trim()] }));
    }
    setCustomSport('');
  };

  const toggleTime = (time) => {
    setPrefs(p => ({
      ...p,
      training_times: p.training_times.includes(time)
        ? p.training_times.filter(t => t !== time)
        : [...p.training_times, time]
    }));
  };

  const savePrefs = async () => {
    setSaving(true);

    try {
      await base44.auth.updateMe({ preferences: prefs });
      await checkUserAuth();
      toast.success('Preferências salvas!');
    } catch (err) {
      console.error('savePrefs failed', err);
      toast.error('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setExporting(true);

    const ENTITIES = [
      'DailyCheckin', 'TrainingSession', 'WorkoutSession', 'HRVRecord',
      'WeeklyRetrospect', 'WorkoutFeedback', 'SleepRecord',
    ];

    try {
      const data = {};
      const counts = {};
      const errors = [];

      for (const name of ENTITIES) {
        let rows;
        try {
          rows = await base44.entities[name].filter({ created_by: user.email }, '-date', 10000);
        } catch {
          // Sort '-date' pode não existir em toda entidade — tenta sem ordenação.
          try {
            rows = await base44.entities[name].filter({ created_by: user.email });
          } catch (err) {
            errors.push({ entity: name, error: String(err) });
            continue;
          }
        }
        const list = Array.isArray(rows) ? rows : [];
        data[name] = list;
        counts[name] = list.length;
      }

      const obj = {
        backup_meta: {
          app: 'Reck',
          schema_version: 1,
          exported_at: new Date().toISOString(),
          user_email: user.email,
          counts,
          errors,
          note: 'Chaves de API e configuracoes locais nao estao neste arquivo.',
        },
        preferences: user.preferences || {},
        data,
      };

      const json = JSON.stringify(obj, null, 2);
      const filename = `reck-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const totalRegistros = Object.values(counts).reduce((a, n) => a + n, 0);

      const blob = new Blob([json], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch (shareErr) {
          // Usuário cancelou a folha de compartilhamento → não é erro.
          if (shareErr?.name === 'AbortError') {
            setExporting(false);
            return;
          }
          // Falha real do share → cai no anchor.
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      if (errors.length > 0) {
        toast.warning(`Backup parcial · falharam: ${errors.map((e) => e.entity).join(', ')}`);
      } else {
        toast.success(`Backup gerado · ${totalRegistros} registros`);
      }
    } catch (err) {
      console.error('exportData failed', err);
      toast.error('Não foi possível gerar o backup agora. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const IMPORT_ENTITIES = [
    'DailyCheckin', 'TrainingSession', 'WorkoutSession', 'HRVRecord',
    'WeeklyRetrospect', 'WorkoutFeedback', 'SleepRecord',
  ];

  const chaveDeRegistro = (r) => (r?.date != null ? `d:${r.date}` : `i:${r?.id}`);

  // Lê e ANALISA o arquivo. Não escreve nada — só monta o preview do que falta.
  const handleFilePick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let obj;
      try {
        const text = await file.text();
        obj = JSON.parse(text);
      } catch {
        toast.error('Arquivo não parece um backup do Reck.');
        return;
      }

      if (!(obj?.backup_meta?.app === 'Reck' && obj.backup_meta.schema_version === 1)) {
        toast.error('Arquivo não parece um backup do Reck.');
        return;
      }

      if (obj.backup_meta.user_email !== user.email) {
        toast.error('Este backup é de outra conta.');
        return;
      }

      const porEntidade = {};
      const avisos = [];
      let total = 0;

      for (const nome of IMPORT_ENTITIES) {
        const registros = Array.isArray(obj.data?.[nome]) ? obj.data[nome] : [];
        if (registros.length === 0) continue;

        try {
          const existentes = await base44.entities[nome].filter({ created_by: user.email }, '-date', 10000);
          const lista = Array.isArray(existentes) ? existentes : [];
          const chaves = new Set(lista.map(chaveDeRegistro));
          let faltando = 0;
          for (const r of registros) {
            if (!chaves.has(chaveDeRegistro(r))) faltando += 1;
          }
          porEntidade[nome] = faltando;
          total += faltando;
        } catch {
          // Entidade que falhar conta como 0 e entra nos avisos.
          porEntidade[nome] = 0;
          avisos.push(nome);
        }
      }

      setImportPreview({ obj, porEntidade, total, nomeArquivo: file.name, avisos });
    } finally {
      // Limpa o input para permitir escolher o mesmo arquivo de novo.
      event.target.value = '';
    }
  };

  // Só roda após o usuário confirmar o preview. Cria SÓ o que falta — nunca update, nunca delete.
  const confirmImport = async () => {
    if (!importPreview?.obj) return;
    setImporting(true);

    const { obj } = importPreview;
    let sucessos = 0;
    let falhas = 0;

    try {
      for (const nome of IMPORT_ENTITIES) {
        const registros = Array.isArray(obj.data?.[nome]) ? obj.data[nome] : [];
        if (registros.length === 0) continue;

        // Relê os existentes na hora de criar — não confia num preview possivelmente velho.
        let lista;
        try {
          const existentes = await base44.entities[nome].filter({ created_by: user.email }, '-date', 10000);
          lista = Array.isArray(existentes) ? existentes : [];
        } catch {
          // Sem conseguir ler os existentes, não arrisca duplicar: pula a entidade inteira.
          continue;
        }
        const chaves = new Set(lista.map(chaveDeRegistro));

        for (const r of registros) {
          const chave = chaveDeRegistro(r);
          if (chaves.has(chave)) continue; // já existe → nunca sobrescreve.

          const { id, created_date, updated_date, created_by, ...registroSemId } = r;
          try {
            await base44.entities[nome].create(registroSemId);
            chaves.add(chave);
            sucessos += 1;
          } catch {
            falhas += 1;
          }
        }
      }

      if (falhas > 0) {
        toast.warning(`${sucessos} registros restaurados · ${falhas} falharam`);
      } else {
        toast.success(`${sucessos} registros restaurados`);
      }
    } finally {
      setImportPreview(null);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Conta, perfil esportivo e preferências fisiológicas</p>
      </div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{user?.full_name || 'Usuário'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Perfil físico */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Perfil físico</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Dados que mudam pouco. Usados para estimar sua Vitalidade e a tendência de longevidade (VO₂max, FC de repouso, sono).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
              Ano de nascimento
            </p>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="1992"
              value={prefs.birth_year || ''}
              onChange={e => setPrefs(p => ({ ...p, birth_year: e.target.value ? Number(e.target.value) : '' }))}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1">
            <p className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
              Sexo
            </p>
            <div className="flex gap-2">
              {[{ v: 'male', l: 'Masculino' }, { v: 'female', l: 'Feminino' }].map(s => (
                <button
                  key={s.v}
                  onClick={() => setPrefs(p => ({ ...p, sex: s.v }))}
                  className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    prefs.sex === s.v
                      ? 'border-primary/50 bg-primary/15 text-foreground'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
              Altura (cm)
            </p>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="178"
              value={prefs.height_cm || ''}
              onChange={e => setPrefs(p => ({ ...p, height_cm: e.target.value ? Number(e.target.value) : '' }))}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1">
            <p className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
              Cintura (cm) — opcional
            </p>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="84"
              value={prefs.waist_cm || ''}
              onChange={e => setPrefs(p => ({ ...p, waist_cm: e.target.value ? Number(e.target.value) : '' }))}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
            VO₂max do relógio (opcional)
          </p>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="ex.: 50"
            value={prefs.vo2max_manual || ''}
            onChange={e => setPrefs(p => ({ ...p, vo2max_manual: e.target.value ? Number(e.target.value) : '' }))}
            className="bg-secondary border-border"
          />
          <p className="t-micro text-muted-foreground">
            Pegue no app Zepp. Se preenchido, é usado direto no cálculo (mais preciso que a estimativa por FC).
          </p>
        </div>
      </motion.div>

      {/* Timezone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Fuso Horário</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Detectado automaticamente. Confirme para garantir datas corretas nos registros.
        </p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary">
          <span className="text-sm font-mono text-primary flex-1">{prefs.timezone}</span>
          <button
            onClick={() => setPrefs(p => ({ ...p, timezone: detectedTz }))}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Redefinir
          </button>
        </div>
      </motion.div>

      {/* Sports Profile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Esportes que Pratica</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ajuda a IA a aprender padrões de fadiga específicos para seus esportes.
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_SPORTS.map(sport => (
            <button
              key={sport}
              onClick={() => toggleSport(sport)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                prefs.sports.includes(sport)
                  ? 'border-primary/50 bg-primary/15 text-foreground'
                  : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>
        {/* Custom sport */}
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar esporte..."
            value={customSport}
            onChange={e => setCustomSport(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomSport()}
            className="bg-secondary border-border text-sm h-8"
          />
          <Button size="sm" variant="outline" onClick={addCustomSport} className="h-8 w-8 p-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        {/* Custom sports tags */}
        {prefs.sports.filter(s => !COMMON_SPORTS.includes(s)).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prefs.sports.filter(s => !COMMON_SPORTS.includes(s)).map(s => (
              <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs">
                {s}
                <button onClick={() => toggleSport(s)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </motion.div>

{/* Daily Guidance Profile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <div>
          <p className="font-semibold text-sm">Perfil para leitura diária</p>
          <p className="text-xs text-muted-foreground mt-1">
            Esses dados substituem o antigo bloco do check-in e ajudam a personalizar a leitura do dia.
          </p>
        </div>

        <div className="space-y-2">
          <p className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Esporte principal
          </p>
          <div className="flex flex-wrap gap-2">
            {['Corrida', 'Musculação', 'Ciclismo', 'Misto'].map((sport) => (
              <button
                key={sport}
                onClick={() =>
  setPrefs((p) => ({
    ...p,
    primary_sport: sport,
    sports: p.sports.includes(sport) ? p.sports : [...p.sports, sport],
  }))
}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  prefs.primary_sport === sport
                    ? 'border-primary/50 bg-primary/15 text-foreground'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Nível
          </p>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setPrefs((p) => ({ ...p, experience_level: level.value }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  prefs.experience_level === level.value
                    ? 'border-primary/50 bg-primary/15 text-foreground'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Objetivo da leitura
          </p>
          <div className="space-y-2">
            {GUIDANCE_GOALS.map((goal) => (
              <button
                key={goal.value}
                onClick={() => setPrefs((p) => ({ ...p, guidance_goal: goal.value }))}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  prefs.guidance_goal === goal.value
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border bg-secondary hover:border-border/80'
                }`}
              >
                <p className="text-sm font-semibold">{goal.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{goal.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </motion.div>


      {/* Typical Training Times */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Horários Típicos de Treino</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Melhora a contextualização dos insights de fadiga tardia.
        </p>
        <div className="flex gap-2">
          {TRAINING_TIMES.map(t => (
            <button
              key={t.value}
              onClick={() => toggleTime(t.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                prefs.training_times.includes(t.value)
                  ? 'border-primary/50 bg-primary/15 text-foreground'
                  : 'border-border bg-secondary text-muted-foreground'
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Max HR */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">FC Máxima Pessoal (bpm)</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Estimativa: 220 − sua idade. Use o valor real se já mediu num esforço máximo. Usado para calcular o Strain.
        </p>
        <Input
          type="number"
          min={120}
          max={220}
          value={prefs.max_hr || 185}
          onChange={e => setPrefs(p => ({ ...p, max_hr: Number(e.target.value) }))}
          className="bg-secondary border-border"
        />
      </motion.div>

      {/* Recovery Goal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Wearable</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Define os rótulos e os campos do check-in. O app guarda só sinais crus, então a fórmula não muda — muda o que você vê e preenche.
        </p>
        <div className="space-y-2">
          {WEARABLES.map(w => (
            <button
              key={w.value}
              onClick={() => setPrefs(p => ({ ...p, wearable_profile: w.value }))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left ${
                prefs.wearable_profile === w.value
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-secondary hover:border-border/80'
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
        <p className="t-micro text-amber-300/90 leading-relaxed">
          ⚠️ rMSSD e SDNN são métricas de HRV diferentes. Misturar wearables contamina seu baseline — ao trocar, considere recomeçar o histórico de HRV.
        </p>
      </motion.div>

      <CoachProviderSettings />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Objetivo de Recuperação</span>
        </div>
        <div className="space-y-2">
          {RECOVERY_GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => setPrefs(p => ({ ...p, recovery_goal: g.value }))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left ${
                prefs.recovery_goal === g.value
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-secondary hover:border-border/80'
              }`}
            >
              <span className="text-2xl">{g.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{g.label}</p>
                <p className="text-xs text-muted-foreground">{g.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Seus dados — export completo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Seus dados</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Baixa todo o seu histórico (check-ins, treinos, HRV e mais) num único arquivo JSON,
          para você guardar onde quiser. Suas chaves de API não vão junto — ficam só no aparelho.
          Restaurar de volta só cria o que está faltando — nunca altera nem apaga nada existente.
        </p>
        <Button
          onClick={exportData}
          disabled={exporting}
          variant="outline"
          className="w-full"
        >
          {exporting ? 'Gerando...' : 'Baixar meus dados (JSON)'}
        </Button>

        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleFilePick}
          className="hidden"
        />
        <Button
          variant="outline"
          className="w-full"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" /> Restaurar de um backup
        </Button>

        {importPreview != null && (
          <div className="rounded-xl border border-border bg-secondary p-4 space-y-3">
            {importPreview.total === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nada a restaurar — este backup não tem registros novos.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Vou criar {importPreview.total} registros que não existem hoje. Nada existente
                  será alterado ou apagado.
                </p>
                <ul className="space-y-1">
                  {Object.entries(importPreview.porEntidade)
                    .filter(([, n]) => n > 0)
                    .map(([nome, n]) => (
                      <li key={nome} className="text-xs text-foreground">
                        {nome}: {n}
                      </li>
                    ))}
                </ul>
              </>
            )}
            {importPreview.avisos?.length > 0 && (
              <p className="t-micro text-amber-300/90 leading-relaxed">
                Não consegui ler o histórico atual de: {importPreview.avisos.join(', ')} — essas
                entidades foram contadas como 0.
              </p>
            )}
            <div className="flex gap-2">
              {importPreview.total > 0 && (
                <Button
                  onClick={confirmImport}
                  disabled={importing || importPreview.total === 0}
                  className="flex-1 font-semibold"
                >
                  {importing ? 'Restaurando...' : `Restaurar ${importPreview.total}`}
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                disabled={importing}
                onClick={() => setImportPreview(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Save */}
      <Button
        onClick={savePrefs}
        disabled={saving}
        className="w-full font-semibold"
      >
        {saving ? 'Salvando...' : 'Salvar Preferências'}
      </Button>

      {/* Logout */}
      <Button
        onClick={() => base44.auth.logout('/login')}
        variant="outline"
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        <LogOut className="w-4 h-4 mr-2" /> Sair da conta
      </Button>
    </div>
  );
}
