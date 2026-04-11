import { useState } from 'react';
import type { CreatePlatformDTO } from '@gamehub/shared';
import { usePlatforms } from '../hooks/use-platforms';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PlatformCard } from '../components/platforms/PlatformCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

function PlatformsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="space-y-4">
        <Skeleton className="h-4 w-36 rounded-full" />
        <Skeleton className="h-12 w-full max-w-2xl rounded-3xl" />
        <Skeleton className="h-6 w-full max-w-2xl rounded-2xl" />
      </section>
      <section className="grid gap-4 rounded-3xl border border-white/10 bg-background-card/80 p-5 lg:grid-cols-[1fr_1fr_220px_auto]">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-80 rounded-[1.75rem]" />
        ))}
      </div>
    </div>
  );
}

export function PlatformsPage() {
  const platformsQuery = usePlatforms();
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [icon, setIcon] = useState('gamepad');

  if (platformsQuery.isLoading) {
    return <PlatformsSkeleton />;
  }

  if (platformsQuery.isError) {
    return <ErrorState title="Não foi possível carregar as plataformas" description="Verifica a ligação com a API e tenta novamente." onRetry={() => void platformsQuery.refetch()} />;
  }

  const platforms = platformsQuery.data ?? [];

  const createPlatform = async () => {
    const payload: CreatePlatformDTO = { name, manufacturer, icon };
    await platformsQuery.createPlatform.mutateAsync(payload);
    setName('');
    setManufacturer('');
    setIcon('gamepad');
  };

  const confirmDelete = (platformId: string) => {
    if (window.confirm('Eliminar esta plataforma?')) {
      void platformsQuery.deletePlatform.mutateAsync(platformId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-text-secondary">Plataformas</p>
        <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">Gestão do hardware do utilizador.</h1>
        <p className="max-w-2xl text-text-secondary">Edita inline, ativa/desativa e adiciona novas plataformas conforme o teu inventário real.</p>
      </section>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-background-card/80 p-5 lg:grid-cols-[1fr_1fr_220px_auto]">
        <Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} placeholder="PlayStation 5" />
        <Input label="Fabricante" value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} placeholder="Sony" />
        <Select label="Ícone" value={icon} onChange={(event) => setIcon(event.target.value)}>
          <option value="gamepad">gamepad</option>
          <option value="monitor">monitor</option>
          <option value="tv">tv</option>
          <option value="console">console</option>
        </Select>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => void createPlatform()} disabled={!name || !manufacturer}>Adicionar</Button>
        </div>
      </section>

      {platforms.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {platforms.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} onSave={(platformId, payload) => void platformsQuery.updatePlatform.mutateAsync({ id: platformId, payload })} onDelete={confirmDelete} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Ainda não há plataformas"
          description="Preenche o formulário acima para criar a primeira plataforma e ativar filtros e recomendações."
        />
      )}
    </div>
  );
}
