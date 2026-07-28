import { useUserCheckins } from '@/hooks/useUserData';
import { getDayScore, getZone } from '@/lib/biocharge-utils';
import { getTodayLocal } from '@/lib/date-utils';

/* ─── Zona do dia para a nav · leitura do cache ────────────────────────────
   A nav lê a zona direto do cache do react-query em vez de esperar a Today
   publicar. Assim a luz do menisco reporta o estado do dia em QUALQUER tela,
   não só na Hoje.

   O limite TEM que ser exatamente 90 — o mesmo que src/pages/Today.jsx usa —
   porque o limite entra no queryKey (ver src/lib/query-keys.js:
   QUERY_KEYS.checkins(email, limit)). Com o MESMO limite, o react-query serve
   do cache e NÃO dispara requisição nova ao navegar entre telas. Divergir o
   limite criaria uma query nova e uma segunda ida ao DailyCheckin.

   Fonte única de zona: importa getDayScore e getZone (biocharge-utils) — não
   reimplementa corte nenhum. getDayScore lê apenas recovery_score e
   morning_recovery_score, ambos do check-in cru; ler o cru aqui produz o
   MESMO valor que a Today exibe.                                            */

export function useTodayZone() {
  const { data: checkins = [] } = useUserCheckins(90);

  const today = getTodayLocal();
  const checkin = checkins.find((c) => c.date === today) || null;
  const score = getDayScore(checkin);

  // null = sem check-in de hoje ou baseline jovem → nav fica slate, sem leitura.
  // (getZone(null) clamparia para 0 e devolveria 'red' — por isso o guard.)
  return score == null ? null : getZone(score);
}
