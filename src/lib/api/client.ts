import 'server-only';

import axios from 'axios';
import { API_BASE_URL, INTERNAL_PROXY_TOKEN } from './config';

/** Timeout para não deixar a rota do Next pendurada se a API estiver fora. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Cliente HTTP para a API Python. Instância única: baseURL, timeout e headers
 * ficam em um lugar só.
 *
 * `validateStatus: () => true` é deliberado. Por padrão o axios lança em
 * qualquer status fora de 2xx, o que misturaria "a API respondeu 401" com
 * "a rede caiu" no mesmo `catch`. Desligando isso, os route handlers seguem
 * inspecionando `status` explicitamente — 401, 409 e 422 são respostas
 * previstas do contrato, não exceções — e o `catch` fica reservado para
 * falha real de transporte (DNS, conexão recusada, timeout).
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true,
  // A API devolve 204 sem corpo no logout; sem isto o axios entrega ''.
  transformResponse: [
    (data: unknown) => {
      if (typeof data !== 'string' || data.length === 0) return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    },
  ],
});

/**
 * POST na API Python.
 *
 * Nunca lança por status HTTP (ver `validateStatus` acima): 401, 409 e 422
 * são respostas previstas do contrato e voltam normalmente para quem chamou.
 * O `catch` de quem chama fica reservado para falha de transporte — conexão
 * recusada, DNS, timeout.
 */
export async function callApi(
  path: string,
  body: unknown,
  request?: Request,
): Promise<{ status: number; data: unknown }> {
  const response = await apiClient.post(path, body, {
    headers: cabecalhosDeOrigem(request),
  });
  return { status: response.status, data: response.data };
}

/**
 * Reenvia o IP de quem realmente fez a requisição.
 *
 * Este código roda no servidor, então a API vê o IP do Amplify e não o do
 * visitante. O limite de tentativas por IP contaria todo mundo junto, e um
 * atacante sozinho trancaria o login de todos — por isso o IP viaja aqui.
 *
 * Vai acompanhado do segredo combinado: a API é pública, e sem prova o
 * cabeçalho seria só um jeito cômodo de forjar identidade. Sem o segredo
 * configurado, nada é enviado e a API usa o IP da conexão.
 *
 */
function cabecalhosDeOrigem(request?: Request): Record<string, string> | undefined {
  if (!request || !INTERNAL_PROXY_TOKEN) return undefined;

  const ip = ipDoVisitante(request);
  if (!ip) return undefined;

  return { 'X-Aperia-Client-Ip': ip, 'X-Aperia-Proxy-Token': INTERNAL_PROXY_TOKEN };
}

/** `Authorization: Bearer` só quando há token — a API aceita rotas públicas sem ele. */
function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

/** GET autenticado. `accessToken` vai como Bearer, como a API espera. */
export async function getApi(
  path: string,
  accessToken?: string,
): Promise<{ status: number; data: unknown }> {
  const response = await apiClient.get(path, { headers: authHeaders(accessToken) });
  return { status: response.status, data: response.data };
}

/**
 * POST/PATCH/DELETE autenticados — usados pelas Server Actions do GitHub.
 *
 * Valem as mesmas regras de `callApi`: nunca lançam por status HTTP, então 401,
 * 404, 409 e 422 voltam para quem chamou como resposta normal.
 */
export async function postApi(
  path: string,
  body: unknown,
  accessToken?: string,
): Promise<{ status: number; data: unknown }> {
  const response = await apiClient.post(path, body, { headers: authHeaders(accessToken) });
  return { status: response.status, data: response.data };
}

export async function patchApi(
  path: string,
  body: unknown,
  accessToken?: string,
): Promise<{ status: number; data: unknown }> {
  const response = await apiClient.patch(path, body, { headers: authHeaders(accessToken) });
  return { status: response.status, data: response.data };
}

export async function deleteApi(
  path: string,
  accessToken?: string,
): Promise<{ status: number; data: unknown }> {
  const response = await apiClient.delete(path, { headers: authHeaders(accessToken) });
  return { status: response.status, data: response.data };
}

/**
 * IP do visitante, segundo o CloudFront.
 *
 * `cloudfront-viewer-address` (formato `ip:porta`) é preenchido e sobrescrito
 * pelo CloudFront, então o cliente não consegue forjá-lo. O `x-forwarded-for`
 * daqui chega como `<visitante>, <edge do CloudFront>` — a ordem é o oposto da
 * que vale na API, onde o Caddy é o proxy imediato e escreve por último. Ler o
 * último item aqui repassava o IP do edge, e todos os visitantes voltavam a
 * cair num contador só, sem nenhum erro aparente.
 */
function ipDoVisitante(request: Request): string | undefined {
  const cloudfront = request.headers.get('cloudfront-viewer-address');
  // A porta vem junto; o corte é pelo último `:` para não quebrar IPv6.
  if (cloudfront) return cloudfront.replace(/:\d+$/, '').trim() || undefined;

  // Fora do CloudFront (dev local, atrás de um proxy só).
  return request.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
}
