import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../auth/use-auth';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await register({ username, email, password });
      navigate('/', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-background-card/80 p-7">
        <p className="text-xs uppercase tracking-[0.25em] text-text-secondary">Conta</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-text-primary">Criar conta</h1>
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Input label="Usuario" value={username} onChange={(event) => setUsername(event.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required helperText="Use ao menos 8 caracteres." />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>
        <p className="mt-5 text-sm text-text-secondary">
          Ja tem conta? <Link to="/login" className="hover:text-text-primary">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
