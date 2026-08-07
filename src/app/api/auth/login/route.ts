import { NextResponse } from 'next/server';
import {
  API_ROUTES,
  apiDetail,
  IS_API_CONFIGURED,
} from '@/lib/api/config';
import { callApi } from '@/lib/api/client';
import { isTokenPair, setSessionCookies } from '@/lib/api/session';

export type AuthResult = { ok: true; demo?: boolean } | { ok: false; message: string };

/**
 * POST /api/auth/login
 *
 * Repassa para `POST /auth/login` da API Python e converte o par de tokens em
 * cookies httpOnly. O browser nunca vê os tokens.
 */
export async function POST(request: Request) {
  let payload: { email?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Requisição inválida.' },
      { status: 400 },
    );
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!email || !password) {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Informe e-mail e senha.' },
      { status: 400 },
    );
  }

  // Sem APERIA_API_URL o protótipo segue navegável sem back-end.
  if (!IS_API_CONFIGURED) {
    return NextResponse.json<AuthResult>({ ok: true, demo: true });
  }

  let result;
  try {
    result = await callApi(API_ROUTES.login, { email, password });
  } catch {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Não foi possível falar com o servidor. Tente novamente.' },
      { status: 502 },
    );
  }

  if (result.status === 401) {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'E-mail ou senha inválidos.' },
      { status: 401 },
    );
  }

  if (result.status !== 200 || !isTokenPair(result.data)) {
    return NextResponse.json<AuthResult>(
      { ok: false, message: apiDetail(result.data) ?? 'Não foi possível entrar.' },
      { status: result.status === 200 ? 502 : result.status },
    );
  }

  const response = NextResponse.json<AuthResult>({ ok: true });
  setSessionCookies(response, result.data);
  return response;
}
