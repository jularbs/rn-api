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
  role?: 'user' | 'admin' | 'moderator';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type UserRole = 'user' | 'admin' | 'moderator';

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  version: string;
}

export interface AppInfo {
  message: string;
  version: string;
  status: string;
  endpoints: {
    health: string;
    auth: string;
    users: string;
    documentation: string;
  };
}
