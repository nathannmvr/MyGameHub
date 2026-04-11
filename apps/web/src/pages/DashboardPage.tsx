import { Link } from 'react-router-dom';

export function DashboardPage() {
  return (
    <section className="grid w-full gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6 animate-slide-up">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-text-secondary">
            Fase 9 - Base do Frontend
          </span>
          <div className="space-y-4">
            <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight text-text-primary sm:text-5xl">
              Game Hub Pessoal começa com uma base sólida para navegação, dados e UI.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
              O routing, o cliente HTTP e o provider de cache já estão prontos para a próxima fase de páginas, formulários e integrações.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-light" to="/library">
              Abrir biblioteca
            </Link>
            <Link className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-white/10" to="/discover">
              Ver descoberta
            </Link>
          </div>
        </div>

        <aside className="grid gap-4 rounded-3xl border border-white/10 bg-background-card/85 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm animate-fade-in">
          <div>
            <p className="text-sm font-medium text-text-secondary">Rotas disponíveis</p>
            <div className="mt-4 grid gap-3 text-sm text-text-primary">
              {['Dashboard', 'Library', 'Game Detail', 'Discover', 'Platforms', 'Settings'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl bg-white/5 p-4 text-sm text-text-secondary">
            <p>Query Client configurado com chaves compartilhadas.</p>
            <p>Axios pronto para consumir /api/v1 com base configurável via VITE_API_URL.</p>
          </div>
        </aside>
    </section>
  );
}