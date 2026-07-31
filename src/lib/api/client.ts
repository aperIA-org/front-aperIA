import 'server-only';

import axios from 'axios';
import { API_BASE_URL } from './config';

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
): Promise<{ status: number; data: unknown }> {
  const response = await apiClient.post(path, body);
  return { status: response.status, data: response.data };
}

/** GET autenticado. `accessToken` vai como Bearer, como a API espera. */
export async function getApi(
  path: string,
  accessToken?: string,
): Promise<{ status: number; data: unknown }> {
  const response = await apiClient.get(path, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return { status: response.status, data: response.data };
}
