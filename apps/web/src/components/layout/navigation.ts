export const navigationItems = [
  { path: '/', label: 'Dashboard', shortLabel: 'Home', description: 'Resumo geral' },
  { path: '/library', label: 'Biblioteca', shortLabel: 'Library', description: 'Coleção local' },
  { path: '/discover', label: 'Descobrir', shortLabel: 'Discover', description: 'Recomendações' },
  { path: '/platforms', label: 'Plataformas', shortLabel: 'Platforms', description: 'Hardware' },
  { path: '/settings', label: 'Definições', shortLabel: 'Settings', description: 'Conta e Steam' },
] as const;

export type NavigationItem = (typeof navigationItems)[number];