// TEMPORARIO — diagnostico do repasse de IP para a API. Remover apos o ajuste.
// Protegida pelo proprio segredo para nao expor cabecalhos a qualquer um.
import 'server-only';

import { NextResponse } from 'next/server';

import { INTERNAL_PROXY_TOKEN } from '@/lib/api/config';

export async function GET(request: Request) {
  if (!INTERNAL_PROXY_TOKEN || request.headers.get('x-diag') !== INTERNAL_PROXY_TOKEN) {
    return new NextResponse(null, { status: 404 });
  }
  const cabecalhos: Record<string, string> = {};
  request.headers.forEach((valor, nome) => {
    if (nome !== 'x-diag') cabecalhos[nome] = valor;
  });
  return NextResponse.json({
    tokenPresente: INTERNAL_PROXY_TOKEN.length > 0,
    cabecalhos,
  });
}
