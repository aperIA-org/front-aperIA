import 'server-only';

/**
 * Configuração da ponte com a API Python (FastAPI, `../python-api`).
 *
 * Este módulo é SERVER-ONLY de propósito: a URL da API e os tokens nunca
 * chegam ao browser. As telas falam apenas com as rotas `/api/auth/*` do
 * próprio Next, que por sua vez falam com a API.
 *
 * Por que um BFF e não fetch direto do browser:
 *   1. A API não registra CORSMiddleware — uma chamada de :3000 para :8000
 *      seria bloqueada pelo browser.
 *   2. O login devolve os tokens no CORPO da resposta. Guardá-los em
 *      localStorage os deixaria legíveis por qualquer XSS. Aqui eles viram
 *      cookies httpOnly, inacessíveis a JavaScript.
 */

/** Sem isto o fluxo cai em MODO DEMONSTRAÇÃO (ver os route handlers). */
export const API_BASE_URL = process.env.APERIA_API_URL ?? '';

export const IS_API_CONFIGURED = API_BASE_URL !== '';

// Reexportadas de ./shared para que o BFF continue importando de um só lugar.
export {
  ACCESS_TOKEN_MAX_AGE,
  API_ROUTES,
  COOKIE_NAMES,
  REFRESH_TOKEN_MAX_AGE,
  sessionCookieOptions,
  type TokenPair,
} from './shared';

/**
 * Limites do schema Pydantic (`UserCreate`). Replicados aqui para falhar cedo,
 * com mensagem em português, em vez de devolver um 422 cru da API.
 */
export const FIELD_LIMITS = {
  usernameMin: 1,
  usernameMax: 255,
  passwordMin: 8,
  passwordMax: 128,
  emailMin: 3,
  emailMax: 500,
} as const;

/** Extrai `detail` de um erro do FastAPI (string ou lista de erros do Pydantic). */
export function apiDetail(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first === 'object' && 'msg' in first) {
      return String((first as { msg: unknown }).msg);
    }
  }
  return null;
}
