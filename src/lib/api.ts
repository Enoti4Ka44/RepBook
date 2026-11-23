
import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const BASE_URL = "/api/v1";
const REFRESH_KEY = "forma_refresh_token";

export const publicApi = axios.create({
  baseURL: BASE_URL,
});

export const api = axios.create({
  baseURL: BASE_URL,
});

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
};

export function saveTokens(tokens: TokenResponse) {
  accessToken = tokens.accessToken;
  sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens() {
  accessToken = null;
  sessionStorage.removeItem(REFRESH_KEY);
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY);
}

export async function refreshSession(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("Нет активной сессии");
  }

  refreshPromise = (async () => {
    try {
      const { data } = await publicApi.post<TokenResponse>(
        "/auth/refresh",
        { refreshToken }
      );

      saveTokens(data);
      return data.accessToken;
    } catch (error) {
      // При временном сбое сети токен не уничтожаем.
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        clearTokens();
        window.dispatchEvent(new Event("forma:unauthorized"));
      }

      throw error;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.set(
        "Authorization",
        `Bearer ${accessToken}`
      );
    }
    return config;
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      !getRefreshToken()
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const token = await refreshSession();
      original.headers.set("Authorization", `Bearer ${token}`);
      return api(original);
    } catch {
      return Promise.reject(error);
    }
  }
);
