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

/**
 * Renova quando o access token tem MENOS que isto de vida — não só quando o
 * cookie some. É a folga que fecha a janela do bug: o cookie de access
 * (`Max-Age` = 15 min) e o JWT (`exp` = 15 min) expiram juntos, mas o cookie é
 * setado alguns segundos DEPOIS do JWT ser criado (latência da API, pior sob
 * carga), então ele sobrevive ao JWT. Nesse intervalo o browser ainda envia o
 * cookie, o middleware achava a sessão válida e pulava o refresh, e os server
 * components batiam na API com um JWT morto → 401 → dashboard deslogado.
 *
 * Com a folga, o middleware renova ANTES do JWT morrer. E como o token antigo
 * ainda vale durante a folga, um refresh que falhe (API lenta) não derruba nada
 * — o render segue com o token velho e tenta de novo no próximo request.
 */
const REFRESH_SKEW_MS = 60_000;

/**
 * Lê o `exp` (segundos epoch) do JWT SEM verificar assinatura — a API é a
 * autoridade sobre validade; aqui só queremos saber se vale a pena renovar.
 * `atob` existe no runtime Edge; os claims (`exp`/`sub`) são ASCII.
 */
function jwtExpiraEm(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (b64.length % 4)) % 4;
    const claims = JSON.parse(atob(b64 + '='.repeat(pad)));
    return typeof claims.exp === 'number' ? claims.exp : null;
  } catch {
    return null;
  }
}

/** `true` se o access token ainda tem folga suficiente para pular o refresh. */
function accessTokenComFolga(token: string): boolean {
  const exp = jwtExpiraEm(token);
  // Indecodificável → trata como expirado (renova). `Date.now()` é wall-clock
  // real: aqui não há render nem hidratação, então a regra do relógio congelado
  // do protótipo não se aplica.
  if (exp === null) return false;
  return exp * 1000 > Date.now() + REFRESH_SKEW_MS;
}

/**
 * Desfecho de uma tentativa de renovação. A distinção é o que impede um logout
 * indevido: só `rejected` (a API recusou o token — 401) autoriza limpar os
 * cookies. Um `unavailable` (5xx, timeout, rede, corpo inválido) é transitório
 * — comum sob carga durante um scan — e NÃO pode derrubar a sessão.
 */
type RefreshOutcome =
  | { status: 'renewed'; tokens: { access_token: string; refresh_token: string } }
  | { status: 'rejected' }
  | { status: 'unavailable' };

async function requestNewTokens(refreshToken: string): Promise<RefreshOutcome> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${API_ROUTES.refresh}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
  } catch {
    // Rede/timeout: API inalcançável, não é veredito sobre o token.
    return { status: 'unavailable' };
  }

  if (response.status === 200) {
    const body = await response.json().catch(() => null);
    return isTokenPair(body)
      ? { status: 'renewed', tokens: body }
      : { status: 'unavailable' };
  }
  // 401 é o único veredito de que o token não serve mais. 5xx e demais são
  // hiccups do servidor — tratados como transitórios para não deslogar à toa.
  return response.status === 401
    ? { status: 'rejected' }
    : { status: 'unavailable' };
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(COOKIE_NAMES.access)?.value;
  const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

  // Renova por EXPIRAÇÃO do JWT, não por ausência do cookie: o cookie sobrevive
  // alguns segundos ao token, e confiar nele deixava passar requests com JWT
  // morto (→ 401 → sessão "caindo"). Ver REFRESH_SKEW_MS.
  const sessaoValida = !!accessToken && accessTokenComFolga(accessToken);

  // Nada a fazer: sessão válida, sem back-end, ou sem refresh token.
  if (sessaoValida || !refreshToken || !apiBaseUrl) {
    return NextResponse.next();
  }

  const outcome = await requestNewTokens(refreshToken);

  if (outcome.status === 'unavailable') {
    // Transitório (API fora, 5xx, timeout): segue sem sessão nesta requisição,
    // mas NÃO limpa os cookies — uma requisição concorrente pode ter renovado,
    // e um hiccup do servidor não é motivo para deslogar no meio de um scan.
    return NextResponse.next();
  }

  if (outcome.status === 'rejected') {
    // 401: a API recusou o token (expirado, revogado ou reuso — neste caso a
    // família inteira já caiu). Aí sim limpa, para não repetir a cada request
    // com um token que nunca mais vai funcionar.
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAMES.access, '', sessionCookieOptions(0));
    response.cookies.set(COOKIE_NAMES.refresh, '', sessionCookieOptions(0));
    return response;
  }

  const { tokens } = outcome;
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
