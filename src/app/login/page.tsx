import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/AuthPage';

export const metadata: Metadata = {
  title: 'aperIA · Entrar',
  description: 'Acesse sua conta na aperIA.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return <AuthPage mode="login" initialEmail={email ?? ''} />;
}
