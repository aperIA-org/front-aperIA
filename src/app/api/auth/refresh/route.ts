import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_ROUTES, COOKIE_NAMES, IS_API_CONFIGURED } from '@/lib/api/config';
import { callApi } from '@/lib/api/client';
import { clearSessionCookies, isTokenPair, setSessionCookies } from '@/lib/api/session';

/**
 * POST /api/auth/refresh
 *
 * Troca o refresh_token por um par novo (a API faz rotação). Em qualquer
 * falha os cookies são limpos: a API invalida a família inteira de tokens ao
 * detectar reuso, então insistir com o token antigo não levaria a nada.
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_NAMES.refresh)?.value;

  if (!IS_API_CONFIGURED) {
    return NextResponse.json({ ok: true, demo: true });
  }

  if (!refreshToken) {
    const response = NextResponse.json({ ok: false }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  let result;
  try {
    result = await callApi(API_ROUTES.refresh, { refresh_token: refreshToken });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  if (result.status !== 200 || !isTokenPair(result.data)) {
    const response = NextResponse.json({ ok: false }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookies(response, result.data);
  return response;
}
