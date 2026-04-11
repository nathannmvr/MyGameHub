import type { ReactNode } from 'react';

interface GameGridProps {
  children: ReactNode;
}

export function GameGrid({ children }: GameGridProps) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div>;
}
