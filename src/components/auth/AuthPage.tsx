import { AuthForm } from '@/components/auth/AuthForm';
import { DashPreviewCarousel } from '@/components/auth/DashPreviewCarousel';
import type { AuthMode } from '@/lib/auth-config';

/**
 * Layout compartilhado por /cadastro e /login.
 *
 * As duas telas são ~80% iguais — todo o painel esquerdo (carrossel do
 * dashboard), e-mail, senha, avisos e submit. A diferença fica em
 * `authCopy()` e em dois campos condicionais dentro do `AuthForm` (nome e
 * aceite dos termos).
 */
export function AuthPage({
  mode,
  initialEmail = '',
}: {
  mode: AuthMode;
  initialEmail?: string;
}) {
  return (
    // `text-ink` explícito: sem cor base, o texto herdaria o preto padrão do
    // navegador — funciona por acidente sobre o bege, mas quebra se o browser
    // forçar tema escuro.
    <div className="grid min-h-screen grid-cols-[minmax(0,0.94fr)_minmax(0,1fr)] bg-paper text-ink max-[880px]:grid-cols-1">
      <DashPreviewCarousel />

      <main className="relative flex max-h-screen justify-center overflow-y-auto px-10 pb-14 pt-10 max-[880px]:max-h-none">
        <AuthForm mode={mode} initialEmail={initialEmail} />
      </main>
    </div>
  );
}
