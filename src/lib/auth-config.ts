/**
 * ═══════════════════════════════════════════════════════════════
 * CONFIG das telas de autenticação.
 *
 * As telas NÃO falam direto com a API Python. Elas chamam as rotas
 * `/api/auth/*` do próprio Next (BFF), que repassam para a API e
 * guardam os tokens em cookies httpOnly. Dois motivos:
 *
 *   1. A API (`../python-api`) não registra CORSMiddleware — uma
 *      chamada do browser para :8000 seria bloqueada.
 *   2. O login devolve os tokens no corpo; em cookie httpOnly eles
 *      ficam fora do alcance de qualquer XSS.
 *
 * A URL da API fica em `APERIA_API_URL` (server-only, sem
 * NEXT_PUBLIC_). Sem ela, o fluxo segue em MODO DEMONSTRAÇÃO e vai
 * direto ao dashboard, como no protótipo.
 * ═══════════════════════════════════════════════════════════════
 */
export const AUTH_CONFIG = {
  SIGNUP_ENDPOINT: '/api/auth/signup',
  LOGIN_ENDPOINT: '/api/auth/login',
  LOGOUT_ENDPOINT: '/api/auth/logout',
  DASHBOARD_URL: '/dash',
} as const;

/** Limites do `UserCreate` (Pydantic) na API. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export type AuthMode = 'signup' | 'login';

export type NoticeKind = 'ok' | 'info' | 'err';

export const NOTICE_COLORS: Record<NoticeKind, string> = {
  ok: '#177a52',
  info: '#2b6cb0',
  err: '#b3232c',
};

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Textos e estados que mudam entre cadastro e login. */
export function authCopy(mode: AuthMode) {
  const login = mode === 'login';
  return {
    login,
    heading: login ? 'Entrar' : 'Criar conta',
    altPrefix: login ? 'Ainda não tem conta?' : 'Já tem uma conta?',
    altLabel: login ? 'Criar conta' : 'Entrar',
    altHref: login ? '/cadastro' : '/login',
    submitLabel: login ? 'Entrar' : 'Criar conta',
  };
}
