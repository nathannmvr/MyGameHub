import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';
import { ForgotPasswordPage } from '../../src/pages/ForgotPasswordPage';

const forgotPasswordMock = vi.fn();
const resetPasswordMock = vi.fn();

vi.mock('../../src/auth/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: forgotPasswordMock,
    resetPassword: resetPasswordMock,
  }),
}));

describe('Password recovery flows (Fase 19)', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset();
    resetPasswordMock.mockReset();
  });

  it('submits forgot-password request', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'recover@example.com');
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() => {
      expect(forgotPasswordMock).toHaveBeenCalledWith({ email: 'recover@example.com' });
    });
  });

  it('completes reset-password flow with token and new password', async () => {
    const user = userEvent.setup();
    resetPasswordMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/reset-password?token=token-123']}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/nova senha/i), 'NewStrongPass123');
    await user.type(screen.getByLabelText(/confirmar senha/i), 'NewStrongPass123');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith({
        token: 'token-123',
        password: 'NewStrongPass123',
      });
    });
  });

  it('shows token error feedback when reset token is invalid', async () => {
    const user = userEvent.setup();
    resetPasswordMock.mockRejectedValue(new Error('Token invalido ou expirado'));

    render(
      <MemoryRouter initialEntries={['/reset-password?token=bad-token']}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/nova senha/i), 'NewStrongPass123');
    await user.type(screen.getByLabelText(/confirmar senha/i), 'NewStrongPass123');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(await screen.findByText(/token invalido ou expirado/i)).toBeInTheDocument();
  });
});
