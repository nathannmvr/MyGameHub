import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../auth/use-auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-background-card/80 p-7">
        <p className="text-xs uppercase tracking-[0.25em] text-text-secondary">Conta</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-text-primary">Entrar</h1>
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-5 flex flex-col gap-2 text-sm text-text-secondary">
          <Link to="/register" className="hover:text-text-primary">Criar conta</Link>
          <Link to="/forgot-password" className="hover:text-text-primary">Recuperar senha</Link>
        </div>
      </div>
    </div>
  );
}
