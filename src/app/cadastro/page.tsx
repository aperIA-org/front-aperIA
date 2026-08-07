import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPage } from '@/components/auth/AuthPage';

export const metadata: Metadata = {
  title: 'aperIA · Criar conta',
  description:
    'Crie sua conta na aperIA e conecte seus repositórios para validar caminhos de ataque reais.',
};

export default async function CadastroPage({
  searchParams,
}: {
  // `email`: o CTA final da landing manda ?email=... via form GET nativo.
  // `mode`: só existe por compatibilidade — ver o redirect abaixo.
  searchParams: Promise<{ email?: string; mode?: string }>;
}) {
  const { email, mode } = await searchParams;

  // O site estático usava uma página só para as duas telas
  // (`cadastro.html?mode=login`), e o logout do dashboard legado ainda aponta
  // para lá. O redirect é feito aqui, e não em `next.config.ts`, porque o
  // config repassaria a query inteira e o destino ficaria `/login?mode=login`.
  if (mode === 'login') {
    redirect(email ? `/login?email=${encodeURIComponent(email)}` : '/login');
  }

  return <AuthPage mode="signup" initialEmail={email ?? ''} />;
}
