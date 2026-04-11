import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../auth/use-auth';
import { getErrorMessage } from '../lib/error';

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) {
      setErrorMessage('Token invalido ou expirado');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas precisam ser iguais');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await resetPassword({ token, password });
      setIsSuccess(true);
      setPassword('');
      setConfirmPassword('');
      navigate('/login', { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-background-card/80 p-7">
        <p className="text-xs uppercase tracking-[0.25em] text-text-secondary">Conta</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-text-primary">Redefinir senha</h1>
        <p className="mt-2 text-sm text-text-secondary">Define uma nova senha para voltar ao GameHub.</p>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Input
            label="Nova senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            label="Confirmar senha"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
          </Button>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-danger">{errorMessage}</p> : null}
        {isSuccess ? <p className="mt-4 text-sm text-success">Senha redefinida com sucesso.</p> : null}

        <p className="mt-5 text-sm text-text-secondary">
          Voltar para <Link to="/login" className="hover:text-text-primary">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
