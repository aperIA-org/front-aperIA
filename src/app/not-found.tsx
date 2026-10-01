'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Página 404 — gato animado (Lottie).
 *
 * Adaptada do componente entregue pronto, com três mudanças obrigatórias:
 *
 * 1. **A animação é servida por nós** (`public/404-cat.json`), não buscada no
 *    `lottie.host`. Uma página de erro que depende de um CDN de terceiro para
 *    renderizar falha justamente quando mais se precisa dela.
 * 2. **A paleta segue o tema**, em vez do salmão e do `#FB0047` fixos do
 *    original. O fundo da animação sai de cena e quem aparece é
 *    `var(--bg-page)`.
 * 3. **O par corpo/olho inverte conforme o tema.** O gato original é preto, e
 *    o tema escuro é a baseline deste projeto (`:root`) — um gato preto sobre
 *    `#0c0d0f` simplesmente não existe. No claro ele volta a ser preto com
 *    olhos brancos.
 *
 * O tema é lido uma vez, na montagem: esta página fica fora do shell do dash,
 * então não há como alterná-lo enquanto ela está aberta.
 */

/** As cores do Lottie são assadas no JSON; não dá para usar CSS custom property. */
type Paleta = {
  corpo: [number, number, number];
  olho: [number, number, number];
  vermelho: [number, number, number];
  cinza: [number, number, number];
  novelo: [number, number, number];
};

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

const PALETAS: Record<'claro' | 'escuro', Paleta> = {
  claro: {
    corpo: rgb('#0e1525'),
    olho: rgb('#ffffff'),
    vermelho: rgb('#c4101a'),
    cinza: rgb('#9a958c'),
    novelo: rgb('#d8d4cb'),
  },
  escuro: {
    corpo: rgb('#e8e6e1'),
    olho: rgb('#0c0d0f'),
    vermelho: rgb('#ff2d3d'),
    cinza: rgb('#6b6f76'),
    novelo: rgb('#3a3d42'),
  },
};

// ── Recoloração ─────────────────────────────────────────────────────────────
//
// Mantida do componente original: a animação vem com uma paleta própria, e a
// troca é feita por aproximação de cor porque o JSON não nomeia os traços.

type Cor = [number, number, number];
type No = Record<string, unknown>;

const LIME: Cor = [0.667, 1, 0];
const DARK: Cor = [26 / 255, 46 / 255, 53 / 255];
const WHITE: Cor = [1, 1, 1];

const perto = (a: number, b: number) => Math.abs(a - b) < 0.03;
const ehCor = (k: unknown, c: Cor) =>
  Array.isArray(k) &&
  k.length >= 3 &&
  perto(k[0], c[0]) &&
  perto(k[1], c[1]) &&
  perto(k[2], c[2]);

function percorrer(no: unknown, fn: (n: No) => void): void {
  if (Array.isArray(no)) {
    no.forEach((x) => percorrer(x, fn));
    return;
  }
  if (no && typeof no === 'object') {
    fn(no as No);
    Object.values(no).forEach((v) => percorrer(v, fn));
  }
}

/** `fl` = preenchimento, `st` = contorno; só esses dois carregam cor. */
function ehTraco(n: No): n is No & { c: { k: number[] } } {
  const c = n.c as { k?: unknown } | undefined;
  return (
    (n.ty === 'fl' || n.ty === 'st') &&
    !!c &&
    Array.isArray(c.k) &&
    typeof c.k[0] === 'number'
  );
}

function trocar(raiz: unknown, pares: [Cor, Cor][]): void {
  percorrer(raiz, (n) => {
    if (!ehTraco(n)) return;
    for (const [de, para] of pares) {
      if (ehCor(n.c.k, de)) {
        n.c.k = [para[0], para[1], para[2], n.c.k[3] ?? 1];
        break;
      }
    }
  });
}

function recolorir(json: Record<string, unknown>, p: Paleta): Record<string, unknown> {
  const camadas = json.layers as { nm?: string; shapes?: unknown }[];

  // Layer 4 = vaso, Layer 3/2 = planta, Layer 1 = fundo salmão. Os três
  // primeiros já saíam no original; o fundo sai aqui para que `var(--bg-page)`
  // apareça e a página acompanhe o tema.
  json.layers = camadas.filter(
    (l) => !['Layer 4', 'Layer 3', 'Layer 2', 'Layer 1'].includes(l.nm ?? ''),
  );

  for (const camada of json.layers as { nm?: string; shapes?: unknown }[]) {
    const nome = camada.nm ?? '';

    if (nome === 'face') {
      percorrer(camada.shapes, (n) => {
        if (!ehTraco(n)) return;
        const a = n.c.k[3] ?? 1;
        if (ehCor(n.c.k, DARK)) {
          // Preenchimento é o olho; contorno é o traço do focinho.
          n.c.k =
            n.ty === 'fl'
              ? [...p.olho, a]
              : [...p.vermelho, a];
        } else if (ehCor(n.c.k, LIME)) {
          n.c.k = [...p.vermelho, a];
        } else if (ehCor(n.c.k, WHITE)) {
          n.c.k = [...p.corpo, a];
        }
      });
    } else if (['head', 'r hand', 'l hand', 'body', 'tail'].includes(nome)) {
      trocar(camada.shapes, [
        [LIME, p.vermelho],
        [WHITE, p.corpo],
        [DARK, p.vermelho],
      ]);
    } else if (nome === 'Layer 7') {
      // Os números: "4" na cor de acento, "0" neutro.
      const grupos = ((camada.shapes as No[]) ?? []).filter((s) => s.ty === 'gr');
      if (grupos.length === 3) {
        grupos.forEach((g, i) => trocar(g, [[DARK, i === 1 ? p.cinza : p.vermelho]]));
      } else {
        trocar(camada.shapes, [[DARK, p.vermelho]]);
      }
      // O original contornava os números de branco para destacá-los do salmão.
      // Sem o fundo, o contraste com `--bg-page` já basta nos dois temas.
    } else if (nome === 'Layer 5' || nome === 'Layer 6') {
      // O novelo. O original só trocava o preenchimento (`WHITE`) porque o
      // fundo salmão mantinha o contorno escuro visível; sem fundo, esses 12
      // traços `DARK` sumiriam contra o `--bg-page` do tema escuro.
      trocar(camada.shapes, [
        [WHITE, p.novelo],
        [DARK, p.cinza],
      ]);
    }
  }
  return json;
}

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let anim: { destroy: () => void } | undefined;
    let cancelado = false;

    // `lottie-web` entra por import dinâmico: são ~250 KB que só fazem sentido
    // nesta página, e deixá-los no bundle comum custaria a todas as outras.
    Promise.all([
      import('lottie-web'),
      fetch('/404-cat.json').then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      }),
    ])
      .then(([lottie, json]) => {
        if (cancelado || !containerRef.current) return;
        const tema =
          document.documentElement.dataset.theme === 'light' ? 'claro' : 'escuro';
        anim = lottie.default.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: recolorir(json, PALETAS[tema]),
        });
      })
      .catch(() => {
        // A página precisa continuar útil sem a animação — é um 404, e o que
        // importa é a saída.
        if (!cancelado) setFalhou(true);
      });

    return () => {
      cancelado = true;
      anim?.destroy();
    };
  }, []);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10"
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      {!falhou && (
        <div
          ref={containerRef}
          role="img"
          aria-label="Gato brincando com um novelo de lã, ao lado do número 404"
          className="w-full"
          style={{ maxWidth: 440 }}
        />
      )}

      <div className="max-w-md text-center">
        <h1 className="text-[22px] font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
          O endereço não existe ou deixou de existir.
        </p>
        <Link href="/dash" className="btn btn-md btn-primary mt-5 inline-flex">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
