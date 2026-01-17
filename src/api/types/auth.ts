import { User } from "./user";

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  code?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface StudentLoginDto {
  nis: string;
  password: string; // Birth date in DDMMYYYY format
}

export interface RefreshDto {
  refreshToken: string;
}
