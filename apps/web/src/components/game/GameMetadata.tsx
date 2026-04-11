import type { LibraryItemExpanded } from '@gamehub/shared';

interface GameMetadataProps {
  item: LibraryItemExpanded;
}

export function GameMetadata({ item }: GameMetadataProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-background-card/80 p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Metadados</p>
        <h2 className="mt-2 text-xl font-semibold text-text-primary">Informação rápida</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">Developer</p>
          <p className="mt-2 text-sm text-text-primary">{item.game.developer ?? 'Não informado'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">Plataforma local</p>
          <p className="mt-2 text-sm text-text-primary">{item.platform.name}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">Géneros</p>
          <p className="mt-2 text-sm text-text-primary">{item.game.genres.length > 0 ? item.game.genres.join(' · ') : 'Sem géneros'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">Review</p>
          <p className="mt-2 text-sm leading-6 text-text-primary">{item.review ?? 'Sem notas pessoais'}</p>
        </div>
      </div>
    </section>
  );
}
