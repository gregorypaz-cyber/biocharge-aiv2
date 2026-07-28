import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/* ─── Zona da nav · canal de publicação ───────────────────────────────────
   A nav precisa saber a zona do dia para acender a luz do menisco. Ela NÃO
   busca esse dado: quem já carregou o recovery score publica aqui.

   Motivo: a fonte única de zona é getZone() (biocharge-utils). Se a nav
   fizesse a própria consulta, existiriam duas leituras do mesmo número —
   exatamente o erro que gerou 4 definições divergentes das mesmas 3 zonas.

   Valores aceitos: 'green' | 'yellow' | 'red' | null.
   null = calibração / sem leitura madura. A nav apaga para slate.          */

const NavZoneContext = createContext({ zone: null, setZone: () => {} });

export function NavZoneProvider({ children }) {
  const [zone, setZone] = useState(null);
  const value = useMemo(() => ({ zone, setZone }), [zone]);
  return <NavZoneContext.Provider value={value}>{children}</NavZoneContext.Provider>;
}

/** Lê a zona corrente. Usado pela nav. */
export function useNavZone() {
  return useContext(NavZoneContext).zone;
}

/**
 * Publica a zona do dia na nav. Chamar na tela que JÁ tem o score em mãos:
 *
 *   useSetNavZone(score == null ? null : getZone(score));
 *
 * Ao desmontar, volta para null — sair da tela que tem leitura devolve a nav
 * ao estado neutro em vez de deixar uma cor velha acesa.
 */
export function useSetNavZone(zone) {
  const { setZone } = useContext(NavZoneContext);
  useEffect(() => {
    setZone(zone ?? null);
    return () => setZone(null);
  }, [zone, setZone]);
}

export default NavZoneContext;
