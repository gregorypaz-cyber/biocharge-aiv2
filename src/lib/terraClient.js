/**
 * Cliente para consultar dados de wearables salvos no Supabase pela Terra.
 *
 * A URL base e a API key (Bearer Token) são registradas como secrets do app
 * (TERRA_SUPABASE_URL / TERRA_SUPABASE_KEY) e nunca ficam no bundle do frontend.
 * Como o browser não tem acesso a process.env, a leitura é feita por uma
 * função de backend proxy — quando o plano permitir — ou, por enquanto,
 * via um endpoint público de leitura exposto pelo próprio Supabase (RLS aberta
 * para SELECT na tabela terra_wearable_data).
 *
 * Enquanto o proxy não existe, este cliente faz GET direto para a URL pública
 * do Supabase (REST) passando o Bearer Token. A chave fica em um header
 * injetado em runtime — NÃO committado no código.
 */

// Publishable key (anon) — segura para o frontend. A secret key (service role)
// fica em backend (secret TERRA_SUPABASE_SECRET_KEY) e NUNCA no bundle.
const SUPABASE_URL = 'https://anmyzcmrrgjvqorjqrvr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nIuf4ql2djTbhumb21oGLA_ekc0xX_G';

/**
 * Busca registros de wearables da Terra no Supabase.
 *
 * @param {Object} opts
 * @param {string} [opts.type]   - Filtra por tipo (sleep, activity, daily).
 * @param {number} [opts.limit]  - Máximo de registros (default 50).
 * @param {string} [opts.order] - Coluna de ordenação (default: created_at).
 * @returns {Promise<Array>}    - Lista de registros.
 */
export async function fetchTerraData({ type, limit = 50, order = 'created_at' } = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Terra: configure VITE_TERRA_SUPABASE_URL e VITE_TERRA_SUPABASE_KEY para consultar os dados.'
    );
  }

  const params = new URLSearchParams({
    order: `${order}.desc`,
    limit: String(limit),
  });
  if (type) params.set('type', 'eq.' + type);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/terra_wearable_data?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Terra GET falhou (${res.status}): ${body}`);
  }

  return res.json();
}

export default { fetchTerraData };