import { useParams } from 'react-router-dom';

export function GameDetailPage() {
  const { id } = useParams();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-start px-6 py-16 lg:px-10">
      <section className="w-full rounded-3xl border border-white/10 bg-background-card/80 p-8 shadow-2xl shadow-black/25">
        <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Detalhe do jogo</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-text-primary">Game #{id}</h1>
        <p className="mt-4 max-w-2xl text-text-secondary">
          O hero, metadados e edição rápida serão adicionados na Fase 10. A rota já está funcional para navegação e deep-linking.
        </p>
      </section>
    </main>
  );
}