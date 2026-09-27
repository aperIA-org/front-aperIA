'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MONITORED_REPOS_ANCHOR } from '@/lib/dash/dash-routes';
import {
  accountLabel,
  repoOwner,
  type AvailableRepo,
  type GithubAccount,
  type GitHubConnection,
} from '@/lib/dash/github';
import { GitHubAccountsCard } from './GitHubAccountsCard';
import { RepoSelector } from './RepoSelector';
import { TargetUrlList } from './TargetUrlList';

function IconWarning({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#eab308"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-px flex-shrink-0"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

const NOTICE_TONE = {
  ok: { fg: '#22c55e', bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.2)' },
  warn: { fg: '#eab308', bg: 'rgba(234,179,8,.08)', border: 'rgba(234,179,8,.22)' },
  error: { fg: '#ef4444', bg: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.22)' },
} as const;

/**
 * Banner do retorno da instalação.
 *
 * O `?github=conectado` NÃO é prova de nada: o redirect de sucesso do callback
 * usa `GITHUB_CONNECT_REDIRECT_URL` cru, então esse parâmetro é uma string fixa
 * do `.env` da API — sobrevive a refresh, bookmark e URL digitada à mão. Por
 * isso o sucesso só é anunciado quando as contas resolvidas neste mesmo render
 * (`GET /github/accounts`) confirmam a instalação; sem confirmação o aviso vira
 * amarelo e diz exatamente o que se sabe.
 *
 * Ao fechar, o parâmetro sai da URL para não reaparecer na próxima visita.
 */
function CallbackNotice({
  status,
  reason,
  confirmedAccount,
  visibleRepoCount,
  resolved,
}: {
  status: string;
  reason?: string;
  /** Conta vinculada mais recente, vinda da API. `null` = nada confirmado. */
  confirmedAccount: GithubAccount | null;
  visibleRepoCount: number;
  resolved: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  let tone: keyof typeof NOTICE_TONE;
  let message: string;

  if (status === 'erro') {
    tone = 'error';
    message =
      reason === 'state'
        ? 'O link de instalação expirou antes de você concluir (ele vale 10 minutos). Tente conectar novamente.'
        : 'Não foi possível concluir a conexão com o GitHub. Tente novamente.';
  } else if (confirmedAccount) {
    tone = 'ok';
    message =
      `Instalação confirmada em ${accountLabel(confirmedAccount)}: o aperIA enxerga ` +
      (visibleRepoCount === 1
        ? '1 repositório dessa conta. '
        : `${visibleRepoCount} repositórios dessa conta. `) +
      'Selecione abaixo os que devem ser monitorados.';
  } else if (!resolved) {
    tone = 'warn';
    message =
      'Você voltou do GitHub, mas o aperIA não conseguiu falar com a API para confirmar a instalação. Recarregue a página.';
  } else {
    tone = 'warn';
    message =
      'Você voltou do GitHub, mas nenhuma instalação aparece vinculada à sua conta ainda. Se acabou de instalar, recarregue em alguns segundos; se não, tente conectar de novo.';
  }

  const colors = NOTICE_TONE[tone];

  /** Tira o parâmetro da URL — o aviso é do retorno, não do endereço. */
  const dismiss = () => {
    setDismissed(true);
    const next = new URLSearchParams(searchParams);
    next.delete('github');
    next.delete('motivo');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div
      role={tone === 'ok' ? 'status' : 'alert'}
      className="mb-4 flex items-start gap-2.5 text-[13px] leading-[1.55]"
      style={{
        padding: '12px 14px',
        borderRadius: 8,
        color: colors.fg,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="cursor-pointer border-none bg-transparent p-0 text-[15px] leading-none"
        style={{ color: 'inherit', opacity: 0.7 }}
      >
        ×
      </button>
    </div>
  );
}

/**
 * Tela de Repositórios: conexões reais do GitHub + seleção do que monitorar.
 *
 * Absorveu a antiga rota `/dash/repositorios/gerenciar`, que só duplicava o
 * seletor — a âncora `#repositorios-monitorados` cobre os links que apontavam
 * para lá.
 *
 * A seção "Scanners e engines" saiu: ela era a única tela que nomeava as
 * ferramentas do pipeline (e suas versões), e a plataforma não expõe qual
 * produto roda em cada etapa — ver o cabeçalho de `pipeline-tools.ts`. Além
 * disso ela vinha inteira do dataset do protótipo; a API não tem estado por
 * ferramenta fora de `scan_tool_runs`, que já alimenta o pipeline do scan.
 */
export function RepositoriosScreen({
  connection,
  available,
  availableFailed,
  callbackStatus,
  callbackReason,
}: {
  connection: GitHubConnection;
  available: readonly AvailableRepo[];
  /** `GET /github/repos` não respondeu — a lista abaixo não é confiável. */
  availableFailed: boolean;
  callbackStatus?: string;
  callbackReason?: string;
}) {
  const connected = connection.accounts.length > 0;
  const monitoredCount = connection.repositories.filter((repo) => repo.active).length;

  // `GET /github/repos` é best-effort do lado da API: uma instalação que falha é
  // ignorada em silêncio. Se alguma conta conectada não aparece na lista, não dá
  // para saber daqui se ela falhou ou se simplesmente não tem repositório algum
  // — a mensagem cobre os dois casos de propósito.
  const ownersListados = new Set(available.map((repo) => repoOwner(repo.full_name))).size;
  const contaSemRepos =
    connected && !availableFailed && ownersListados < connection.accounts.length;

  // Evidência para o banner de retorno: a instalação recém-feita é a conta mais
  // nova que a API devolveu. Sem nenhuma conta, não há o que confirmar.
  const contaMaisRecente =
    connection.accounts.length > 0
      ? [...connection.accounts].sort(
          (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
        )[0]
      : null;

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight">Repositórios</h1>
        <p className="mt-1 text-[13px] text-fg-dim">Conexões e repositórios do aperIA</p>
      </div>

      {callbackStatus && (
        <CallbackNotice
          status={callbackStatus}
          reason={callbackReason}
          confirmedAccount={contaMaisRecente}
          visibleRepoCount={
            contaMaisRecente
              ? available.filter((repo) => repo.github_account_id === contaMaisRecente.id).length
              : 0
          }
          resolved={connection.resolved}
        />
      )}

      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-mute">
        Conexões
      </div>

      <GitHubAccountsCard
        accounts={connection.accounts}
        repositories={connection.repositories}
        demo={connection.demo}
        resolved={connection.resolved}
      />

      <div style={{ height: 1, background: 'var(--border-default)', margin: '24px 0' }} />

      <div
        id={MONITORED_REPOS_ANCHOR}
        className="mb-3 scroll-mt-20 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-mute"
      >
        Repositórios monitorados
      </div>

      {connected ? (
        <>
          <p className="mb-3 text-[13px] leading-[1.6] text-fg-dim" style={{ marginTop: -4 }}>
            Instalar o App dá visibilidade; o scan de 3 tiers roda só nos repositórios
            selecionados aqui, a cada pull request aberto ou atualizado.
          </p>

          {availableFailed && (
            <div
              className="mb-3 flex items-start gap-2 text-[12.5px] leading-[1.55]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <IconWarning />
              <span>
                Não foi possível listar os repositórios das suas instalações agora. Recarregue a
                página para tentar de novo.
              </span>
            </div>
          )}

          {contaSemRepos && (
            <div
              className="mb-3 flex items-start gap-2 text-[12.5px] leading-[1.55]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <IconWarning />
              <span>
                Uma das contas conectadas não trouxe nenhum repositório — ou a instalação não
                tem acesso a nenhum, ou a consulta ao GitHub falhou. Use &ldquo;Gerenciar acesso
                no GitHub&rdquo; para conferir.
              </span>
            </div>
          )}

          {available.length === 0 && !availableFailed ? (
            <div className="stat-card" style={{ textAlign: 'center', padding: 32 }}>
              <h2 className="mb-2 text-[15px] font-semibold">
                Nenhum repositório visível para o aperIA
              </h2>
              <p className="mx-auto mb-5 max-w-[56ch] text-[13px] leading-[1.6] text-fg-mute">
                A instalação do GitHub App não concedeu acesso a nenhum repositório. Ajuste o
                acesso no GitHub — em &ldquo;Repository access&rdquo; — e recarregue esta página.
              </p>
              <p className="text-[12.5px] text-fg-dim">
                O link &ldquo;Gerenciar acesso no GitHub&rdquo; acima leva direto à instalação.
              </p>
            </div>
          ) : (
            <RepoSelector
              available={available}
              submitLabel="Salvar seleção"
              demo={connection.demo}
            />
          )}

          {monitoredCount === 0 && available.length > 0 && (
            <p className="mt-3 text-[12.5px] leading-[1.55] text-fg-dim">
              Nenhum repositório monitorado: enquanto isso, nenhum pull request é analisado.
            </p>
          )}

          {monitoredCount > 0 && (
            <>
              <div className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-mute">
                Alvo de DAST (opcional)
              </div>
              <TargetUrlList
                repositories={connection.repositories}
                demo={connection.demo}
              />
            </>
          )}
        </>
      ) : (
        <div className="stat-card" style={{ textAlign: 'center', padding: 32 }}>
          <h2 className="mb-2 text-[15px] font-semibold">Conecte o GitHub</h2>
          <p className="mx-auto max-w-[52ch] text-[13px] leading-[1.6] text-fg-mute">
            Depois de instalar o GitHub App, os repositórios que ele enxergar aparecem aqui para
            você escolher quais serão escaneados.
          </p>
        </div>
      )}
    </div>
  );
}
