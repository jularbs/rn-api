export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: "user" | "admin" | "moderator";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export type UserRole = "user" | "admin" | "moderator" | "owner";
