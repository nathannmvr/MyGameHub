import { JobStatus, type SyncJobDTO } from '@gamehub/shared';

interface SyncProgressBarProps {
  syncJob: SyncJobDTO | null;
}

export function SyncProgressBar({ syncJob }: SyncProgressBarProps) {
  if (!syncJob) {
    return null;
  }

  const progress = syncJob.totalItems === 0 ? 0 : Math.round((syncJob.processedItems / syncJob.totalItems) * 100);
  const isCompleted = syncJob.status === JobStatus.COMPLETED;
  const isFailed = syncJob.status === JobStatus.FAILED;

  return (
    <section className="space-y-3 rounded-3xl border border-white/10 bg-background-card/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Steam sync</p>
          <h2 className="mt-2 text-lg font-semibold text-text-primary">
            {isCompleted ? 'Concluído' : isFailed ? 'Erro na sincronização' : 'A sincronizar'}
          </h2>
        </div>
        <span className="text-sm text-text-secondary">
          {syncJob.processedItems}/{syncJob.totalItems}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all ${isFailed ? 'bg-accent-red' : isCompleted ? 'bg-accent-green' : 'bg-primary'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm text-text-secondary">
        {isCompleted
          ? 'Sincronização finalizada com sucesso.'
          : isFailed
            ? syncJob.errorMessage ?? 'Ocorreu um erro durante a sincronização.'
            : `A sincronizar ${syncJob.processedItems}/${syncJob.totalItems} jogos...`}
      </p>
    </section>
  );
}
