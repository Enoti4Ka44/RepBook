
import { publicApi } from "@/lib/api";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export async function loginRequest(data: LoginRequest) {
  const response = await publicApi.post<TokenResponse>(
    "/auth/login",
    data
  );

  return response.data;
}

export async function registerRequest(data: RegisterRequest) {
  const response = await publicApi.post<TokenResponse>(
    "/auth/register",
    data
  );

  return response.data;
}

export async function logoutRequest(refreshToken: string) {
  await publicApi.post("/auth/logout", {
    refreshToken,
  });
}
