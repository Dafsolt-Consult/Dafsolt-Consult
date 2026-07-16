import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const ACCESS_TOKEN_KEY = "dafsolt.accessToken";
const REFRESH_TOKEN_KEY = "dafsolt.refreshToken";

export const tokenStore = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const { data } = await axios.post("/api/auth/refresh", { refreshToken });
  tokenStore.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes("/auth/")) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        tokenStore.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

interface ZodFlattenedError {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; details?: ZodFlattenedError } | undefined;

    // Zod validation errors put the useful detail in `details`, not `message`
    // (the API's error handler intentionally keeps `message` generic for
    // these) — surface the actual field-level reasons instead.
    const fieldErrors = data?.details?.fieldErrors;
    if (fieldErrors) {
      const messages = Object.entries(fieldErrors)
        .filter((entry): entry is [string, string[]] => !!entry[1]?.length)
        .map(([field, errors]) => `${field}: ${errors.join(", ")}`);
      if (messages.length) return messages.join("; ");
    }

    return data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
