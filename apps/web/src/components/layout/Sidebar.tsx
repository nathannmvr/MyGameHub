import { NavLink } from 'react-router-dom';
import { navigationItems } from './navigation';

function iconForPath(path: string) {
  switch (path) {
    case '/':
      return (
        <path d="M4 12h16M4 6h10M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      );
    case '/library':
      return (
        <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h11A2.5 2.5 0 0 1 21 5.5v13A2.5 2.5 0 0 1 18.5 21h-11A2.5 2.5 0 0 1 5 18.5v-13Zm3 1.5h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      );
    case '/discover':
      return (
        <path d="M12 3 4.5 19.5 12 15l7.5 4.5L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      );
    case '/platforms':
      return (
        <path d="M6 7.5h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Zm3 0v8m6-8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      );
    default:
      return (
        <path d="M8 10.5A4 4 0 1 1 16 10.5a4 4 0 0 1-8 0Zm-3 9.5a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      );
  }
}

export function Sidebar() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-background/95 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary-light ring-1 ring-primary/25">
            <span className="font-display text-lg font-bold">GH</span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-text-primary">Game Hub</p>
            <p className="text-xs uppercase tracking-[0.22em] text-text-secondary">Pessoal</p>
          </div>
        </div>

        <nav className="mt-10 flex flex-1 flex-col gap-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => [
                'group flex items-center gap-4 rounded-2xl border px-4 py-3 transition-all duration-200',
                isActive
                  ? 'border-primary/30 bg-primary/15 text-text-primary shadow-lg shadow-primary/10'
                  : 'border-transparent text-text-secondary hover:border-white/8 hover:bg-white/5 hover:text-text-primary',
              ].join(' ')}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-current ring-1 ring-white/10 group-hover:bg-white/10">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {iconForPath(item.path)}
                </svg>
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-xs text-text-muted">{item.description}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">Fluxo base pronto</p>
          <p className="mt-2 leading-6">Routing, query cache e shell responsivo prontos para a camada de páginas e dados.</p>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/95 px-3 py-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 gap-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => [
                'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
                isActive ? 'bg-primary/20 text-text-primary' : 'text-text-secondary',
              ].join(' ')}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {iconForPath(item.path)}
                </svg>
              </span>
              <span>{item.shortLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}