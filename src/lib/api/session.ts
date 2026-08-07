import 'server-only';

import type { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_MAX_AGE,
  COOKIE_NAMES,
  isTokenPair,
  REFRESH_TOKEN_MAX_AGE,
  sessionCookieOptions,
  type TokenPair,
} from './shared';

export { isTokenPair };

/**
 * Os tokens vivem em cookies httpOnly — JavaScript não os enxerga, então um
 * XSS não consegue exfiltrá-los (o que aconteceria com localStorage).
 *
 * `sameSite: 'lax'` bloqueia envio em requisições cross-site, mas preserva a
 * navegação normal por link. `secure` só em produção, senão o cookie não
 * gruda em http://localhost.
 */
export function setSessionCookies(response: NextResponse, tokens: TokenPair): void {
  response.cookies.set(
    COOKIE_NAMES.access,
    tokens.access_token,
    sessionCookieOptions(ACCESS_TOKEN_MAX_AGE),
  );
  response.cookies.set(
    COOKIE_NAMES.refresh,
    tokens.refresh_token,
    sessionCookieOptions(REFRESH_TOKEN_MAX_AGE),
  );
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_NAMES.access, '', sessionCookieOptions(0));
  response.cookies.set(COOKIE_NAMES.refresh, '', sessionCookieOptions(0));
}

