import { useState } from 'react';
import type { CreatePlatformDTO } from '@gamehub/shared';
import { usePlatforms } from '../hooks/use-platforms';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PlatformCard } from '../components/platforms/PlatformCard';

export function PlatformsPage() {
  const platformsQuery = usePlatforms();
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [icon, setIcon] = useState('gamepad');

  if (platformsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="A carregar plataformas" />
      </div>
    );
  }

  if (platformsQuery.isError) {
    return <section className="rounded-3xl border border-white/10 bg-background-card/80 p-8 text-text-secondary">Não foi possível carregar as plataformas.</section>;
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

      <div className="grid gap-4 xl:grid-cols-2">
        {platforms.map((platform) => (
          <PlatformCard key={platform.id} platform={platform} onSave={(platformId, payload) => void platformsQuery.updatePlatform.mutateAsync({ id: platformId, payload })} onDelete={confirmDelete} />
        ))}
      </div>
    </div>
  );
}
