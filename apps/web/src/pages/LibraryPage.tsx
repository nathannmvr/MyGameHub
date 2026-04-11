export function LibraryPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-start px-6 py-16 lg:px-10">
      <section className="w-full space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-text-secondary">Biblioteca</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-text-primary sm:text-4xl">A página da biblioteca entra na Fase 10.</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">
            Nesta fase a navegação já está pronta; os filtros, cards e formulários virão na implementação de conteúdo.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {['Grid de capas', 'Filtros rápidos', 'Paginação'].map((item) => (
            <div key={item} className="rounded-3xl border border-white/10 bg-background-card/80 p-6 text-text-primary shadow-xl shadow-black/20">
              <h2 className="text-lg font-semibold">{item}</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Estrutura reservada para os componentes de biblioteca da próxima fase.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}