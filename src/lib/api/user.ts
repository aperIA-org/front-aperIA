import 'server-only';

import { cookies } from 'next/headers';
import { getApi } from './client';
import { COOKIE_NAMES, IS_API_CONFIGURED } from './config';

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
};

/**
 * Persona usada quando não há sessão real (modo demonstração, sem
 * `APERIA_API_URL`). Mantém o mesmo nome que aparece nos dados mock —
 * `REMEDIATIONS` tem `approved_by: 'marina.alves@acme.io'`.
 */
export const DEMO_USER: CurrentUser = {
  id: 'demo',
  username: 'Marina Alves',
  email: 'marina.alves@acme.io',
};

/**
 * Lê a claim `sub` do access token SEM verificar a assinatura.
 *
 * Isso é seguro aqui porque o token não vem do usuário: vem de um cookie
 * httpOnly que só este servidor grava, e apenas depois de um login bem
 * sucedido. A verificação criptográfica é feita pela API a cada requisição —
 * aqui o `sub` serve só para saber QUAL usuário buscar. Nada de decisão de
 * autorização é tomada a partir deste valor.
 */
function readSubject(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    // base64url → base64
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    );
    const claims = JSON.parse(json) as { sub?: unknown };
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
}

function isUserResponse(data: unknown): data is { id: string; username: string; email: string } {
  return (
    !!data &&
    typeof data === 'object' &&
    typeof (data as { username?: unknown }).username === 'string' &&
    typeof (data as { email?: unknown }).email === 'string'
  );
}

/**
 * Usuário autenticado, para o header do dashboard.
 *
 * A API não expõe `/users/me`, então o caminho é: `sub` do JWT → `GET /users/{id}`.
 * Retorna `DEMO_USER` quando não há back-end configurado, e `null` quando há
 * back-end mas a sessão não resolve (cookie ausente/expirado) — nesse caso o
 * header mostra um estado neutro em vez de inventar um nome.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!IS_API_CONFIGURED) return DEMO_USER;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.access)?.value;
  if (!accessToken) return null;

  const subject = readSubject(accessToken);
  if (!subject) return null;

  try {
    const { status, data } = await getApi(`/users/${subject}`, accessToken);
    if (status !== 200 || !isUserResponse(data)) return null;
    return { id: data.id ?? subject, username: data.username, email: data.email };
  } catch {
    // API fora do ar — o header cai no estado neutro.
    return null;
  }
}

/** "Marina Alves" → "MA"; "marina" → "MA". */
export function userInitials(username: string): string {
  const parts = username.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Primeiro nome, para o rótulo compacto do header. */
export function firstName(username: string): string {
  return username.trim().split(/\s+/)[0] || username;
}
