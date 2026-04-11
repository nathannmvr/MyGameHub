import { Link } from 'react-router-dom';
import type { LibraryItemExpanded } from '@gamehub/shared';

interface ContinuePlayingCarouselProps {
  items: LibraryItemExpanded[];
}

export function ContinuePlayingCarousel({ items }: ContinuePlayingCarouselProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-background-card/80 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Continue jogando</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Jogos em progresso</h2>
        </div>
        <span className="text-sm text-text-secondary">{items.length} em destaque</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-text-secondary">
          Nenhum jogo a correr no momento.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map((item) => (
            <article key={item.id} className="min-w-[240px] max-w-[240px] shrink-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-lg shadow-black/20">
              <div className="aspect-[4/5] bg-background-hover">
                {item.game.coverUrl ? (
                  <img src={item.game.coverUrl} alt={item.game.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">{item.platform.name}</p>
                  <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-text-primary">{item.game.title}</h3>
                </div>
                <p className="text-sm text-text-secondary">{item.game.developer ?? 'Developer não informado'}</p>
                <Link className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white/10" to={`/library/${item.id}`}>
                  Abrir detalhe
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
