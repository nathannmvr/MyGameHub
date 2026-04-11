import { useMemo, useState } from 'react';
import { GameStatus, type GameSearchResult, type Platform } from '@gamehub/shared';
import { useGameSearch } from '../../hooks/use-game-search';
import { useLibrary } from '../../hooks/use-library';
import { usePlatforms } from '../../hooks/use-platforms';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

interface AddGameModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddGameModal({ open, onClose }: AddGameModalProps) {
  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(null);
  const [platformId, setPlatformId] = useState('');
  const [status, setStatus] = useState<GameStatus>(GameStatus.BACKLOG);
  const [rating, setRating] = useState('');
  const [playtimeHours, setPlaytimeHours] = useState('');
  const [review, setReview] = useState('');

  const platformsQuery = usePlatforms();
  const libraryQuery = useLibrary();
  const searchQuery = useGameSearch(search);

  const platforms = platformsQuery.data ?? [];

  const effectivePlatformId = platformId || platforms[0]?.id || '';

  const selectedGameLabel = useMemo(() => selectedGame?.title ?? 'Nenhum jogo selecionado', [selectedGame]);

  const addGame = async () => {
    if (!selectedGame || !effectivePlatformId) {
      return;
    }

    await libraryQuery.addLibraryItem.mutateAsync({
      rawgId: selectedGame.rawgId,
      platformId: effectivePlatformId,
      status,
      rating: rating ? Number(rating) : undefined,
      playtimeHours: playtimeHours ? Number(playtimeHours) : undefined,
      review: review || undefined,
    });

    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar jogo à biblioteca">
      <div className="space-y-5">
        <Input label="Buscar jogo" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite ao menos 2 caracteres" />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">Resultado selecionado</p>
          <p className="mt-2 text-sm font-medium text-text-primary">{selectedGameLabel}</p>
        </div>

        <div className="space-y-3">
          {searchQuery.isFetching ? <Spinner label="A procurar jogos" /> : null}
          {searchQuery.data?.data?.length ? (
            <div className="grid gap-3 max-h-64 overflow-auto pr-1">
              {searchQuery.data.data.map((game) => (
                <button
                  key={game.rawgId}
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
                  onClick={() => setSelectedGame(game)}
                >
                  <p className="font-medium text-text-primary">{game.title}</p>
                  <p className="text-sm text-text-secondary">{game.platforms.join(', ') || 'Plataformas não informadas'}</p>
                </button>
              ))}
            </div>
          ) : search.trim().length >= 2 && !searchQuery.isFetching ? (
            <p className="text-sm text-text-secondary">Sem resultados para esta pesquisa.</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as GameStatus)}>
            {Object.values(GameStatus).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>

          <Select label="Plataforma" value={effectivePlatformId} onChange={(event) => setPlatformId(event.target.value)}>
            <option value="">Seleciona uma plataforma</option>
            {platforms.map((platform: Platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nota" type="number" min="1" max="10" value={rating} onChange={(event) => setRating(event.target.value)} />
          <Input label="Horas jogadas" type="number" min="0" step="0.5" value={playtimeHours} onChange={(event) => setPlaytimeHours(event.target.value)} />
        </div>

        <Input label="Review" value={review} onChange={(event) => setReview(event.target.value)} placeholder="Notas rápidas" />

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              void addGame();
            }}
            disabled={!selectedGame || !effectivePlatformId || libraryQuery.addLibraryItem.isPending}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
