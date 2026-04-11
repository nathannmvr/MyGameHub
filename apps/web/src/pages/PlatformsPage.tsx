export function PlatformsPage() {
  return (
    <section className="w-full space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-text-secondary">Plataformas</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-text-primary sm:text-4xl">Gestão de hardware fica disponível em breve.</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {['Cards de plataforma', 'Toggle ativo/inativo', 'Formulário de criação'].map((item) => (
          <div key={item} className="rounded-3xl border border-white/10 bg-background-card/80 p-6 text-text-primary">
            <h2 className="text-lg font-semibold">{item}</h2>
            <p className="mt-2 text-sm text-text-secondary">Reservado para a camada de interação da Fase 10.</p>
          </div>
        ))}
      </div>
    </section>
  );
}