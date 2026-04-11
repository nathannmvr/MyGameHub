export function SettingsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-start px-6 py-16 lg:px-10">
      <section className="w-full space-y-6 rounded-3xl border border-white/10 bg-background-card/80 p-8 shadow-2xl shadow-black/25">
        <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Definições</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-text-primary">Perfil, Steam ID e sincronização</h1>
        <p className="max-w-2xl text-text-secondary">
          O formulário real de perfil e o botão de sincronização Steam serão acoplados após a base visual e os hooks de dados estarem concluídos.
        </p>
      </section>
    </main>
  );
}