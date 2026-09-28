'use client';

import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AUTH_CONFIG,
  authCopy,
  isValidEmail,
  NOTICE_COLORS,
  PASSWORD_MAX,
  PASSWORD_MIN,
  type AuthMode,
  type NoticeKind,
} from '@/lib/auth-config';
import { clearSessionState } from '@/lib/storage';

type Notice = { text: string; kind: NoticeKind } | null;

const FIELD_CLASS =
  'w-full rounded-xl border border-field-line bg-panel px-4 py-[15px] text-[15px] text-ink ' +
  'transition-[border-color,box-shadow] duration-150 outline-none ' +
  'focus:border-brand focus:shadow-[0_0_0_3px_rgba(216,31,42,0.14)]';

const LABEL_CLASS = 'mb-[9px] block text-sm font-bold text-ink';

export function AuthForm({
  mode,
  initialEmail,
}: {
  mode: AuthMode;
  initialEmail: string;
}) {
  const router = useRouter();
  const copy = authCopy(mode);

  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Onde o dash abre agora é decidido pela conexão GitHub real do usuário
   * (resolvida no servidor), não mais por localStorage. `clearSessionState()`
   * segue aqui só para descartar as chaves da era simulada em quem já tinha uma
   * sessão antiga no browser.
   */
  function goToDashboard() {
    clearSessionState();
    router.push(AUTH_CONFIG.DASHBOARD_URL);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const senha = String(data.get('senha') ?? '');
    const nome = String(data.get('nome') ?? '').trim();
    const terms = data.get('terms') === 'on';

    if (!isValidEmail(email)) {
      setNotice({ text: 'Informe um e-mail válido.', kind: 'err' });
      return;
    }
    if (senha.length < PASSWORD_MIN || senha.length > PASSWORD_MAX) {
      setNotice({
        text: `A senha precisa ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`,
        kind: 'err',
      });
      return;
    }
    if (!copy.login && nome.length < 2) {
      setNotice({ text: 'Informe seu nome.', kind: 'err' });
      return;
    }
    if (!copy.login && !terms) {
      setNotice({ text: 'Aceite os Termos de Uso para continuar.', kind: 'err' });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      // O BFF traduz os nomes de campo para o schema da API
      // (nome → username, senha → password) e cuida dos cookies.
      // `validateStatus` desligado: 400/401/409 trazem uma mensagem pronta no
      // corpo, então são tratados aqui e não no catch.
      const { status, data } = await axios.post<{ ok?: boolean; message?: string }>(
        copy.login ? AUTH_CONFIG.LOGIN_ENDPOINT : AUTH_CONFIG.SIGNUP_ENDPOINT,
        copy.login
          ? { email, password: senha }
          : { username: nome, email, password: senha },
        { validateStatus: () => true },
      );

      if (status >= 200 && status < 300 && data?.ok) {
        goToDashboard();
        return;
      }

      setBusy(false);
      setNotice({
        text:
          data?.message ??
          (copy.login
            ? 'E-mail ou senha inválidos.'
            : 'Não foi possível criar a conta.'),
        kind: 'err',
      });
    } catch {
      setBusy(false);
      setNotice({ text: 'Falha de conexão. Tente novamente.', kind: 'err' });
    }
  }

  return (
    <div className="mx-0 my-auto w-full max-w-[440px]">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-[7px] text-sm font-semibold text-ink-soft transition-colors duration-150 hover:text-ink"
      >
        <span className="text-base">←</span> Voltar ao site
      </Link>

      <h1 className="mb-3 font-display text-[38px] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
        {copy.heading}
      </h1>
      <p className="mb-[30px] text-[15px] text-ink-soft">
        {copy.altPrefix}{' '}
        <Link href={copy.altHref} className="font-bold text-brand hover:text-accent">
          {copy.altLabel}
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        {!copy.login && (
          <div>
            <label htmlFor="nome" className={LABEL_CLASS}>
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Seu nome"
              className={FIELD_CLASS}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className={LABEL_CLASS}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={initialEmail}
            placeholder="voce@empresa.com"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="senha" className={LABEL_CLASS}>
            Senha
          </label>
          <div className="relative flex items-center">
            <input
              id="senha"
              name="senha"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className={`${FIELD_CLASS} pr-[74px]`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-[14px] cursor-pointer border-none bg-transparent p-1 font-mono text-[13px] text-ink-soft"
            >
              {showPassword ? 'ocultar' : 'mostrar'}
            </button>
          </div>
        </div>

        {!copy.login && (
          <label className="mt-0.5 flex cursor-pointer items-start gap-[11px] text-[13.5px] leading-[1.5] text-[#5b616c]">
            <input
              type="checkbox"
              name="terms"
              className="mt-0.5 h-[17px] w-[17px] shrink-0 accent-brand"
            />
            <span>
              Concordo com os{' '}
              <a href="#" className="font-semibold text-brand hover:text-accent">
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a href="#" className="font-semibold text-brand hover:text-accent">
                Política de Privacidade
              </a>
              .
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1.5 w-full cursor-pointer rounded-xl border-none bg-brand p-4 font-display text-base font-bold text-white shadow-[0_12px_30px_-12px_rgba(216,31,42,0.7)] transition-colors duration-150 hover:bg-brand-hov disabled:cursor-default"
        >
          {busy ? 'Aguarde…' : copy.submitLabel}
        </button>
      </form>

      {notice && (
        <div
          className="mt-4 text-[13.5px] leading-[1.5]"
          style={{ color: NOTICE_COLORS[notice.kind] }}
          role="status"
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}
