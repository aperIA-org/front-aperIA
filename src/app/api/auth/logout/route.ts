import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_ROUTES, COOKIE_NAMES, IS_API_CONFIGURED } from '@/lib/api/config';
import { callApi } from '@/lib/api/client';
import { clearSessionCookies } from '@/lib/api/session';

/**
 * POST /api/auth/logout
 *
 * Revoga o refresh_token na API e limpa os cookies. Os cookies são limpos
 * SEMPRE, mesmo se a revogação falhar — a sessão local não pode ficar presa
 * por causa de um erro de rede. (A API também responde 204 para token já
 * inválido, de propósito, para não virar um oráculo.)
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_NAMES.refresh)?.value;

  if (IS_API_CONFIGURED && refreshToken) {
    try {
      await callApi(API_ROUTES.logout, { refresh_token: refreshToken });
    } catch {
      /* segue e limpa os cookies mesmo assim */
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
