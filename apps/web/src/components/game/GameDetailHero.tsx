import type { LibraryItemExpanded } from '@gamehub/shared';

interface GameDetailHeroProps {
  item: LibraryItemExpanded;
}

export function GameDetailHero({ item }: GameDetailHeroProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-background-card/80 shadow-2xl shadow-black/20">
      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <div className="aspect-[4/5] bg-background-hover lg:aspect-auto lg:min-h-[420px]">
          {item.game.coverUrl ? <img src={item.game.coverUrl} alt={item.game.title} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="space-y-5 p-6 lg:p-8">
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.24em] text-text-secondary">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{item.platform.name}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{item.status}</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">{item.game.title}</h1>
            <p className="mt-3 max-w-2xl text-text-secondary">{item.game.developer ?? 'Developer não informado'}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">Nota</p>
              <p className="mt-2 text-lg font-semibold text-text-primary">{item.rating ?? 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">Horas jogadas</p>
              <p className="mt-2 text-lg font-semibold text-text-primary">{item.playtimeHours ?? 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">Adicionado</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{new Date(item.addedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
