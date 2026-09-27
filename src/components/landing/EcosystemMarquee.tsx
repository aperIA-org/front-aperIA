import Image from 'next/image';
import { ECOSYSTEM_TILES, type EcosystemTile } from '@/lib/landing/ecosystem-tiles';

const TILE_CLASS =
  'flex h-[84px] w-[180px] flex-none items-center justify-center rounded-[14px] border border-paper-line bg-[#f6f7f8]';

function Tile({ tile, duplicate }: { tile: EcosystemTile; duplicate: boolean }) {
  return (
    <div className={TILE_CLASS} aria-hidden={duplicate || undefined}>
      {tile.kind === 'text' ? (
        <span className={tile.textClassName}>{tile.name}</span>
      ) : (
        <Image
          src={tile.src}
          alt={duplicate ? '' : tile.name}
          width={tile.width}
          height={tile.height}
          className={`block h-auto w-auto object-contain ${tile.fitClassName}`}
        />
      )}
    </div>
  );
}

/**
 * Faixa "COBERTURA DO CÓDIGO À NUVEM, EM TODAS AS CAMADAS".
 *
 * No HTML original este bloco ficava dentro da seção de Pull Request e um patch
 * script o movia para o fim da hero em runtime. Aqui ele já é renderizado no
 * lugar certo — os valores de padding/background abaixo são os da camada de
 * override, não os do markup original.
 *
 * A trilha é renderizada duas vezes porque a animação translada -50%; a segunda
 * cópia é decorativa (`aria-hidden`, `alt=""`).
 */
export function EcosystemMarquee() {
  return (
    <div className="mx-auto mt-1 flex max-w-[1240px] flex-col items-center gap-7 bg-transparent px-8 pb-1.5 pt-[22px]">
      <p className="text-center text-[11.5px] tracking-[0.2em] text-ink-strong">
        COBERTURA DO CÓDIGO À NUVEM, EM TODAS AS CAMADAS
      </p>

      <div className="mq-wrap">
        {/* Os 16 tiles são irmãos diretos e uniformemente espaçados: o
            translateX(-50%) da animação só fecha o loop se as duas metades
            tiverem exatamente a mesma largura. */}
        <div className="mq-track">
          {ECOSYSTEM_TILES.map((tile) => (
            <Tile key={tile.name} tile={tile} duplicate={false} />
          ))}
          {ECOSYSTEM_TILES.map((tile) => (
            <Tile key={`dup-${tile.name}`} tile={tile} duplicate />
          ))}
        </div>
      </div>
    </div>
  );
}
