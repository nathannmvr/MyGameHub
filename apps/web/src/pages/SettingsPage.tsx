import { useState } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { usePlatforms } from '../hooks/use-platforms';
import { useSteamSync } from '../hooks/use-steam-sync';
import { SyncProgressBar } from '../components/steam/SyncProgressBar';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useNavigate } from 'react-router-dom';

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="space-y-4">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-12 w-full max-w-2xl rounded-3xl" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Skeleton className="h-90 rounded-3xl" />
        <Skeleton className="h-90 rounded-3xl" />
      </section>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const platformsQuery = usePlatforms();
  const steamSync = useSteamSync();
  const [username, setUsername] = useState('Nathan');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [steamId, setSteamId] = useState('');
  const [platformId, setPlatformId] = useState('');

  if (platformsQuery.isLoading) {
    return <SettingsSkeleton />;
  }

  if (platformsQuery.isError) {
    return <ErrorState title="Não foi possível carregar as definições" description="A lista de plataformas falhou. Tenta novamente." onRetry={() => void platformsQuery.refetch()} />;
  }

  const platforms = platformsQuery.data ?? [];
  const effectivePlatformId = platformId || platforms[0]?.id || '';

  const startSync = () => {
    if (!steamId || !effectivePlatformId) {
      return;
    }

    void steamSync.startSteamSync.mutateAsync({ steamId, platformId: effectivePlatformId });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-text-secondary">Definições</p>
        <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">Perfil e sincronização Steam.</h1>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-white/10 bg-background-card/80 p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Perfil</p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">Dados básicos</h2>
          </div>
          <div className="grid gap-4">
            <Input label="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input label="Avatar URL" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
          </div>
        </div>

        <div className="space-y-5 rounded-3xl border border-white/10 bg-background-card/80 p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Steam</p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">Sincronização automática</h2>
          </div>
          <div className="grid gap-4">
            <Input
              label="Steam ID"
              value={steamId}
              onChange={(event) => setSteamId(event.target.value)}
              placeholder="76561198185150675"
              helperText="Usa um Steam ID 64-bit com perfil público para o sync completo."
            />
            <Select label="Plataforma" value={effectivePlatformId} onChange={(event) => setPlatformId(event.target.value)}>
              <option value="">Seleciona uma plataforma</option>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>{platform.name}</option>
              ))}
            </Select>
          </div>
          <Button className="w-full" onClick={startSync} disabled={steamSync.startSteamSync.isPending || !steamId || !effectivePlatformId}>
            Sincronizar
          </Button>
          <SyncProgressBar syncJob={steamSync.syncJob} />
          {platforms.length === 0 ? (
            <EmptyState
              title="Cria uma plataforma para sincronizar"
              description="A sincronização Steam precisa de uma plataforma ativa para associar os jogos importados."
              actionLabel="Abrir plataformas"
              onAction={() => navigate('/platforms')}
              className="mt-2"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
