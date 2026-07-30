/**
 * ═══════════════════════════════════════════════════════════════
 * CONFIG · conectar ao back-end depois é só preencher aqui.
 *
 * - SIGNUP_ENDPOINT / LOGIN_ENDPOINT: rotas POST do backend.
 *   Recebem JSON e devem responder 2xx em caso de sucesso.
 *   Enquanto vazios, o fluxo segue em MODO DEMONSTRAÇÃO
 *   (vai direto para DASHBOARD_URL, sem gravar nada).
 * - GOOGLE_CLIENT_ID: OAuth Web (console.cloud.google.com).
 * - DASHBOARD_URL: para onde redirecionar após autenticar.
 *
 * Migrado de `legacy/cadastro.html`. As variáveis NEXT_PUBLIC_*
 * permitem configurar por ambiente sem editar código; se não
 * estiverem definidas, o modo demonstração continua valendo.
 * ═══════════════════════════════════════════════════════════════
 */
export const AUTH_CONFIG = {
  SIGNUP_ENDPOINT: process.env.NEXT_PUBLIC_SIGNUP_ENDPOINT ?? '',
  LOGIN_ENDPOINT: process.env.NEXT_PUBLIC_LOGIN_ENDPOINT ?? '',
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
  GOOGLE_REDIRECT_PATH: '/auth/google/callback',
  DASHBOARD_URL: '/dash',
} as const;

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
    googleLabel: login ? 'Entrar com Google' : 'Continuar com Google',
    dividerText: login ? 'ou entre com e-mail' : 'ou cadastre-se com e-mail',
    submitLabel: login ? 'Entrar' : 'Criar conta',
  };
}
