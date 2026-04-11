import { useState } from 'react';
import { GameStatus, type LibraryItemExpanded, type Platform } from '@gamehub/shared';
import { useLibrary } from '../../hooks/use-library';
import { usePlatforms } from '../../hooks/use-platforms';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { StarRating } from '../ui/StarRating';

interface QuickEditFormProps {
  item: LibraryItemExpanded;
}

export function QuickEditForm({ item }: QuickEditFormProps) {
  const [status, setStatus] = useState<GameStatus>(item.status);
  const [platformId, setPlatformId] = useState(item.platform.id);
  const [rating, setRating] = useState(String(item.rating ?? ''));
  const [review, setReview] = useState(item.review ?? '');

  const libraryQuery = useLibrary();
  const platformsQuery = usePlatforms();
  const platforms = platformsQuery.data ?? [];

  const submit = async () => {
    await libraryQuery.updateLibraryItem.mutateAsync({
      id: item.id,
      payload: {
        status,
        platformId,
        rating: rating ? Number(rating) : null,
        review: review || null,
      },
    });
  };

  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-background-card/80 p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Edição rápida</p>
        <h2 className="mt-2 text-xl font-semibold text-text-primary">Atualizar jogo</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as GameStatus)}>
          {Object.values(GameStatus).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>

        <Select label="Plataforma" value={platformId} onChange={(event) => setPlatformId(event.target.value)}>
          {platforms.length === 0 ? <option value={item.platform.id}>{item.platform.name}</option> : null}
          {platforms.map((platform: Platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Avaliação</p>
          <StarRating value={rating ? Number(rating) : 0} max={10} onChange={(value) => setRating(String(value))} />
        </div>
        <Input label="Review" value={review} onChange={(event) => setReview(event.target.value)} placeholder="Notas pessoais" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void submit()} disabled={libraryQuery.updateLibraryItem.isPending}>
          Guardar alterações
        </Button>
      </div>
    </section>
  );
}
