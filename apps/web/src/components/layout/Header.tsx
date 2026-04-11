import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_ROUTES, type ApiResponse, type LibraryItemExpanded, type PaginatedResponse } from '@gamehub/shared';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-client';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { navigationItems } from './navigation';

const routeLabelByPath = new Map<string, string>(navigationItems.map((item) => [item.path, item.label]));

function getCurrentPageLabel(pathname: string) {
  if (pathname.startsWith('/library/')) {
    return 'Detalhe do jogo';
  }

  return routeLabelByPath.get(pathname) ?? 'Game Hub Pessoal';
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageLabel = getCurrentPageLabel(location.pathname);
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const librarySearchQuery = useQuery({
    queryKey: queryKeys.library({ global: true, q: debouncedSearch }),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PaginatedResponse<LibraryItemExpanded>>>(
        API_ROUTES.LIBRARY.LIST,
        {
          params: {
            search: debouncedSearch,
            page: 1,
            pageSize: 6,
            sort: 'added',
            order: 'desc',
          },
        },
      );

      return response.data.data.data;
    },
    enabled: debouncedSearch.length >= 2,
    placeholderData: (previousData) => previousData,
  });

  const results = librarySearchQuery.data ?? [];
  const showResults = isFocused && debouncedSearch.length >= 2;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">{pageLabel}</p>
          <h1 className="mt-2 truncate font-display text-2xl font-semibold text-text-primary">Game Hub Pessoal</h1>
        </div>

        <div className="relative hidden min-w-[18rem] flex-1 justify-center md:flex">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-text-secondary shadow-lg shadow-black/10">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm8 13.5L15 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setIsFocused(false), 120);
              }}
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              placeholder="Buscar jogo na sua biblioteca"
            />
            <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-text-muted">/</span>
          </div>

          {showResults ? (
            <div className="absolute top-full z-50 mt-2 w-full max-w-xl rounded-2xl border border-white/10 bg-background-card/95 p-2 shadow-2xl shadow-black/35 backdrop-blur">
              {librarySearchQuery.isFetching && results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-text-secondary">Buscando jogos...</p>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-text-primary transition hover:bg-white/10"
                      onMouseDown={() => {
                        setIsFocused(false);
                        setSearch('');
                        navigate(`/library/${item.id}`);
                      }}
                    >
                      <span className="truncate">{item.game.title}</span>
                      <span className="ml-3 text-xs uppercase tracking-[0.16em] text-text-secondary">{item.status}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-sm text-text-secondary">Nenhum jogo encontrado na biblioteca.</p>
              )}
            </div>
          ) : null}
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