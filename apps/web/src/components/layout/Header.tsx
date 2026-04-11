import { useLocation } from 'react-router-dom';
import { navigationItems } from './navigation';

const routeLabelByPath = new Map<string, string>(navigationItems.map((item) => [item.path, item.label]));

function getCurrentPageLabel(pathname: string) {
  if (pathname.startsWith('/library/')) {
    return 'Detalhe do jogo';
  }

  return routeLabelByPath.get(pathname) ?? 'Game Hub Pessoal';
}

export function Header() {
  const location = useLocation();
  const pageLabel = getCurrentPageLabel(location.pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">{pageLabel}</p>
          <h1 className="mt-2 truncate font-display text-2xl font-semibold text-text-primary">Game Hub Pessoal</h1>
        </div>

        <div className="hidden min-w-[18rem] flex-1 justify-center md:flex">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-text-secondary shadow-lg shadow-black/10">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm8 13.5L15 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm">Busca global entra na próxima fase</span>
            <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-text-muted">/</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary md:block">
            API ready
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-sm font-bold text-white shadow-lg shadow-primary/20">
            N
          </div>
        </div>
      </div>
    </header>
  );
}