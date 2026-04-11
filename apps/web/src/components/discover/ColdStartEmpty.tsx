import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../ui/EmptyState';

export function ColdStartEmpty() {
  const navigate = useNavigate();

  return (
    <EmptyState
      title="Sem recomendacoes personalizadas ainda"
      description="Adicione alguns jogos na biblioteca para desbloquear sugestoes mais precisas. Enquanto isso, voce pode explorar os destaques em alta."
      actionLabel="Adicionar jogos na biblioteca"
      onAction={() => navigate('/library')}
    />
  );
}
