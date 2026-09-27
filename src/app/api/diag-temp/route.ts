// TEMPORARIO — diagnostico do repasse de IP. Remover apos o ajuste.
// Nao usar prefixo "_" no diretorio: no App Router ele marca pasta privada
// e a rota simplesmente nao existe (404 do Next, sem erro no build).
// Nao expoe valores: so quais variaveis existem em runtime e os cabecalhos
// de rede (cookie e authorization ficam de fora).
import 'server-only';

import { NextResponse } from 'next/server';

const CHAVE_DIAG = 'diag-2026-09-27-aperia';

export async function GET(request: Request) {
  if (request.headers.get('x-diag') !== CHAVE_DIAG) {
    return new NextResponse(null, { status: 404 });
  }

  const cabecalhos: Record<string, string> = {};
  request.headers.forEach((valor, nome) => {
    if (!['cookie', 'authorization', 'x-diag'].includes(nome)) cabecalhos[nome] = valor;
  });

  return NextResponse.json({
    varsEmRuntime: Object.keys(process.env)
      .filter((k) => /^(APERIA|INTERNAL|NEXT_PUBLIC)/.test(k))
      .map((k) => `${k}(${(process.env[k] ?? '').length})`),
    cabecalhos,
  });
}
