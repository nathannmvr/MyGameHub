import { createContext } from 'react';
import type { AuthUser, ForgotPasswordPayload, LoginPayload, RegisterPayload, ResetPasswordPayload } from './auth-types';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
