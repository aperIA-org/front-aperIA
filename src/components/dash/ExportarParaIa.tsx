'use client';

import { useState } from 'react';

/**
 * Baixa o relatório no formato que uma ferramenta de I.A pessoal consome.
 *
 * O conteúdo chega pronto do servidor: é lá que `ia`, as etapas e os findings já
 * estão resolvidos, e montar de novo no browser significaria mandar os mesmos
 * dados duas vezes.
 *
 * O download é feito com `Blob` local, sem passar por rota nenhuma — o arquivo
 * nunca sai do navegador até a pessoa decidir para onde mandar. Isso importa
 * aqui: o destino é um serviço de terceiros, e a escolha é dela.
 */
export function ExportarParaIa({
  conteudo,
  nomeArquivo,
}: {
  conteudo: string;
  nomeArquivo: string;
}) {
  const [baixado, setBaixado] = useState(false);

  function baixar() {
    const blob = new Blob([conteudo], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Sem isto o blob fica retido enquanto a aba viver.
    URL.revokeObjectURL(url);

    setBaixado(true);
    window.setTimeout(() => setBaixado(false), 2400);
  }

  return (
    <button
      type="button"
      onClick={baixar}
      className="btn btn-sm btn-ghost"
      title="Baixa um resumo em markdown para colar numa ferramenta de I.A"
    >
      {baixado ? (
        <>
          <IconCheck />
          Baixado
        </>
      ) : (
        <>
          <IconDownload />
          Exportar para I.A
        </>
      )}
    </button>
  );
}

function IconDownload() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
