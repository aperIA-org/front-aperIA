'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * O modal do attack path é aberto de DOIS lugares — o botão "Ver o caminho
 * completo →" da seção Attack Path e o botão dentro do comentário do bot no
 * mock de Pull Request. Por isso o estado vive num contexto e não numa seção.
 */
type AttackPathModalValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const AttackPathModalContext = createContext<AttackPathModalValue | null>(null);

export function AttackPathModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Trava o scroll do body e fecha no Escape enquanto aberto.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  return (
    <AttackPathModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </AttackPathModalContext.Provider>
  );
}

export function useAttackPathModal(): AttackPathModalValue {
  const value = useContext(AttackPathModalContext);
  if (!value) {
    throw new Error('useAttackPathModal precisa estar dentro de AttackPathModalProvider');
  }
  return value;
}
