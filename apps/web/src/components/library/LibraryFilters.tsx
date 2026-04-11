import type { ChangeEvent } from 'react';
import { GameStatus, type Platform } from '@gamehub/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export interface LibraryFiltersValue {
  status?: GameStatus;
  platformId?: string;
  sort?: 'name' | 'rating' | 'playtime' | 'added';
  order?: 'asc' | 'desc';
  search?: string;
}

interface LibraryFiltersProps {
  value: LibraryFiltersValue;
  platforms: Platform[];
  onChange: (nextValue: LibraryFiltersValue) => void;
}

const sortOptions: Array<{ label: string; value: LibraryFiltersValue['sort'] }> = [
  { label: 'Adicionado recentemente', value: 'added' },
  { label: 'Nome', value: 'name' },
  { label: 'Nota', value: 'rating' },
  { label: 'Horas jogadas', value: 'playtime' },
];

export function LibraryFilters({ value, platforms, onChange }: LibraryFiltersProps) {
  const updateField = (field: keyof LibraryFiltersValue) => (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    onChange({
      ...value,
      [field]: event.target.value || undefined,
    });
  };

  return (
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-background-card/80 p-5 lg:grid-cols-5">
      <Select label="Status" value={value.status ?? ''} onChange={updateField('status')}>
        <option value="">Todos os status</option>
        {Object.values(GameStatus).map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>

      <Select label="Plataforma" value={value.platformId ?? ''} onChange={updateField('platformId')}>
        <option value="">Todas as plataformas</option>
        {platforms.map((platform) => (
          <option key={platform.id} value={platform.id}>
            {platform.name}
          </option>
        ))}
      </Select>

      <Select label="Ordenar por" value={value.sort ?? 'added'} onChange={updateField('sort')}>
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select label="Direção" value={value.order ?? 'desc'} onChange={updateField('order')}>
        <option value="desc">Decrescente</option>
        <option value="asc">Crescente</option>
      </Select>

      <Input label="Busca" value={value.search ?? ''} onChange={updateField('search')} placeholder="Pesquisar por título" />
    </section>
  );
}
