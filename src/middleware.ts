import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_MAX_AGE,
  API_ROUTES,
  COOKIE_NAMES,
  isTokenPair,
  REFRESH_TOKEN_MAX_AGE,
  sessionCookieOptions,
} from '@/lib/api/shared';

/**
 * Renovação silenciosa da sessão (refresh-on-expiry).
 *
 * POR QUE EM MIDDLEWARE: o access token vive num cookie de 15 minutos. Quando
 * ele expira, o browser simplesmente para de enviá-lo, e o dashboard perderia
 * a identidade do usuário mesmo com o refresh token (7 dias) ainda válido.
 * Gravar cookie é impossível em server component — só Route Handler, Server
 * Action ou middleware. O middleware é o único que roda ANTES da página, então
 * é o único lugar onde a renovação fica invisível para quem usa.
 *
 * O cookie novo é escrito em DOIS lugares:
 *   - `request.cookies`, para o server component desta mesma requisição já ler
 *     o token novo (senão o primeiro carregamento após expirar ainda falharia);
 *   - `response.cookies`, para o browser guardar.
 *
 * ÚNICO `fetch` do projeto — e é proposital. O resto do código usa axios, mas
 * aqui não dá: o axios chama `setImmediate` e `process.nextTick`, que não
 * existem no runtime Edge (o build acusa "A Node.js API is used ... which is
 * not supported in the Edge Runtime"). O `adapter: 'fetch'` não resolve, porque
 * o aviso vem do `utils.js` importado junto com o pacote. `fetch` é nativo aqui.
 */

const apiBaseUrl = process.env.APERIA_API_URL ?? '';

const REFRESH_TIMEOUT_MS = 5_000;

async function requestNewTokens(refreshToken: string): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${API_ROUTES.refresh}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
    signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
  });
  if (response.status !== 200) return null;
  return response.json().catch(() => null);
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(COOKIE_NAMES.access)?.value;
  const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

  // Nada a fazer: sessão válida, sem back-end, ou sem refresh token.
  if (accessToken || !refreshToken || !apiBaseUrl) {
    return NextResponse.next();
  }

  let tokens: unknown = null;
  try {
    tokens = await requestNewTokens(refreshToken);
  } catch {
    // API fora do ar: segue sem sessão em vez de derrubar a navegação.
    return NextResponse.next();
  }

  if (!isTokenPair(tokens)) {
    // Refresh recusado (expirado, revogado ou reuso detectado — neste último
    // caso a API invalida a família inteira). Limpa para não tentar de novo a
    // cada request com um token que nunca vai funcionar.
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAMES.access, '', sessionCookieOptions(0));
    response.cookies.set(COOKIE_NAMES.refresh, '', sessionCookieOptions(0));
    return response;
  }

  // Deixa o token novo visível para esta requisição...
  request.cookies.set(COOKIE_NAMES.access, tokens.access_token);
  request.cookies.set(COOKIE_NAMES.refresh, tokens.refresh_token);
  const response = NextResponse.next({ request });

  // ...e persiste no browser.
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
  return response;
}

export const config = {
  /**
   * Só onde existe sessão para renovar. Fora daqui o middleware nem roda —
   * importa porque cada execução pode custar uma chamada à API.
   *
   * `/api/auth/*` está de fora de propósito: essas rotas gerenciam os cookies
   * elas mesmas, e o middleware brigaria com elas (o logout, por exemplo,
   * limpa cookies que o middleware tentaria renovar).
   */
  matcher: ['/dash/:path*'],
};
