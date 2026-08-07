import Image from 'next/image';

/**
 * O mascote da hero: a arte base com um bob suave e, por cima, a camada de
 * brilho em `mix-blend-mode: screen` respirando em outro ritmo.
 *
 * O blend depende do bege ser uma camada realmente pintada — por isso o fundo
 * fica no `body`/section, não num wrapper transparente.
 */
export function MascotArt() {
  return (
    <div className="relative w-full max-w-[560px]">
      <Image
        src="/assets/mascote-gato.png"
        alt="Mascote aperIA — gato cibernético"
        width={1024}
        height={1024}
        priority
        className="relative block h-auto w-full"
        style={{
          animation: 'catBob 5.5s ease-in-out infinite',
          filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.28))',
        }}
      />
      <Image
        src="/assets/mascote-gato-glow.png"
        alt=""
        aria-hidden="true"
        width={1024}
        height={1024}
        className="pointer-events-none absolute inset-0 block h-auto w-full"
        style={{
          mixBlendMode: 'screen',
          opacity: 0.2,
          animation:
            'catBob 5.5s ease-in-out infinite, breatheEmit 3.8s ease-in-out infinite',
          filter: 'drop-shadow(0 0 6px rgba(255,77,84,0.55))',
        }}
      />
    </div>
  );
}
