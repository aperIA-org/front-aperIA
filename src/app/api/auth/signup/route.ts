import { NextResponse } from 'next/server';
import {
  API_ROUTES,
  apiDetail,
  FIELD_LIMITS,
  IS_API_CONFIGURED,
} from '@/lib/api/config';
import { callApi } from '@/lib/api/client';
import { isTokenPair, setSessionCookies } from '@/lib/api/session';
import type { AuthResult } from '../login/route';

/**
 * POST /api/auth/signup
 *
 * Duas chamadas à API Python, porque `POST /users` responde apenas
 * `{ id }` — sem tokens:
 *
 *   1. POST /users        cria o usuário
 *   2. POST /auth/login   autentica e devolve o par de tokens
 *
 * O passo 2 é o que mantém o fluxo original (cadastrar já entra no
 * dashboard). Se ele falhar, a conta ainda foi criada — nesse caso a resposta
 * pede login manual em vez de fingir sucesso.
 */
export async function POST(request: Request) {
  let payload: { username?: unknown; email?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Requisição inválida.' },
      { status: 400 },
    );
  }

  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  // Espelha os limites do UserCreate para dar erro em português antes do 422.
  if (username.length < FIELD_LIMITS.usernameMin || username.length > FIELD_LIMITS.usernameMax) {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Informe seu nome.' },
      { status: 400 },
    );
  }
  if (email.length < FIELD_LIMITS.emailMin || email.length > FIELD_LIMITS.emailMax) {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Informe um e-mail válido.' },
      { status: 400 },
    );
  }
  if (password.length < FIELD_LIMITS.passwordMin || password.length > FIELD_LIMITS.passwordMax) {
    return NextResponse.json<AuthResult>(
      {
        ok: false,
        message: `A senha precisa ter entre ${FIELD_LIMITS.passwordMin} e ${FIELD_LIMITS.passwordMax} caracteres.`,
      },
      { status: 400 },
    );
  }

  if (!IS_API_CONFIGURED) {
    return NextResponse.json<AuthResult>({ ok: true, demo: true });
  }

  // ── 1. cria o usuário ──
  let created;
  try {
    // `extra="forbid"` no schema: só username, password e email.
    created = await callApi(API_ROUTES.createUser, { username, password, email });
  } catch {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Não foi possível falar com o servidor. Tente novamente.' },
      { status: 502 },
    );
  }

  if (created.status === 409) {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Este e-mail já está cadastrado.' },
      { status: 409 },
    );
  }

  if (created.status !== 201) {
    return NextResponse.json<AuthResult>(
      {
        ok: false,
        message: apiDetail(created.data) ?? 'Não foi possível criar a conta.',
      },
      { status: created.status },
    );
  }

  // ── 2. autentica logo em seguida ──
  let logged;
  try {
    logged = await callApi(API_ROUTES.login, { email, password });
  } catch {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Conta criada! Faça login para continuar.' },
      { status: 502 },
    );
  }

  if (logged.status !== 200 || !isTokenPair(logged.data)) {
    return NextResponse.json<AuthResult>(
      { ok: false, message: 'Conta criada! Faça login para continuar.' },
      { status: 502 },
    );
  }

  const response = NextResponse.json<AuthResult>({ ok: true });
  setSessionCookies(response, logged.data);
  return response;
}
