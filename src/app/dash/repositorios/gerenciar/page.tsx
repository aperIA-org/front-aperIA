'use client';

import { useRouter } from 'next/navigation';
import { RepoSelector } from '@/components/dash/RepoSelector';
import { SCREEN_ROUTES } from '@/lib/dash/dash-routes';
import { useDashState } from '@/lib/dash/dash-state';
import { GH_ORG, INSTALLATION_REPOS } from '@/lib/dash/mock-data';

/** Gerenciar quais repositórios o aperIA monitora (modo "manage" do protótipo). */
export default function GerenciarRepositoriosPage() {
  const router = useRouter();
  const { monitored, setMonitored, mounted } = useDashState();

  if (!mounted) return null;

  return (
    <div className="page-wrap" style={{ maxWidth: 760 }}>
      <div className="mb-6">
        <h1 className="mb-1.5 text-[26px] font-bold tracking-[-0.02em]">
          Repositórios monitorados
        </h1>
        <p className="max-w-[56ch] text-sm leading-[1.6] text-fg-mute">
          A instalação dá acesso a {INSTALLATION_REPOS.length} repositórios de {GH_ORG}.
          Cada PR nos repositórios selecionados dispara o scan de 3 tiers.
        </p>
      </div>

      <RepoSelector
        initialSelection={monitored}
        submitLabel="Salvar alterações"
        onSubmit={(repos) => {
          setMonitored(repos);
          router.push(SCREEN_ROUTES.integrations);
        }}
      />
    </div>
  );
}
