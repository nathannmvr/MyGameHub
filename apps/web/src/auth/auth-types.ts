export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  username: string;
}

export interface ForgotPasswordPayload {
  email: string;
}
