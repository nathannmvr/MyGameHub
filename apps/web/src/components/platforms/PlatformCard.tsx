import { useState } from 'react';
import type { Platform, UpdatePlatformDTO } from '@gamehub/shared';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface PlatformCardProps {
  platform: Platform;
  onSave: (platformId: string, payload: UpdatePlatformDTO) => void;
  onDelete: (platformId: string) => void;
}

export function PlatformCard({ platform, onSave, onDelete }: PlatformCardProps) {
  const [name, setName] = useState(platform.name);
  const [manufacturer, setManufacturer] = useState(platform.manufacturer);
  const [icon, setIcon] = useState(platform.icon);
  const [isActive, setIsActive] = useState(platform.isActive);

  return (
    <article className="space-y-4 rounded-[1.75rem] border border-white/10 bg-background-card/80 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-text-secondary">{platform.manufacturer}</p>
          <h3 className="mt-2 text-xl font-semibold text-text-primary">{platform.name}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-accent-green/20 text-accent-green' : 'bg-white/5 text-text-secondary'}`}>
          {isActive ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      <div className="grid gap-3">
        <Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="Fabricante" value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} />
        <Select label="Ícone" value={icon} onChange={(event) => setIcon(event.target.value)}>
          <option value="gamepad">gamepad</option>
          <option value="monitor">monitor</option>
          <option value="tv">tv</option>
          <option value="console">console</option>
        </Select>
      </div>

      <label className="flex items-center gap-3 text-sm text-text-secondary">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Ativa para recomendações
      </label>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="danger" onClick={() => onDelete(platform.id)}>Eliminar</Button>
        <Button variant="secondary" onClick={() => onSave(platform.id, { name, manufacturer, icon, isActive })}>Guardar</Button>
      </div>
    </article>
  );
}
