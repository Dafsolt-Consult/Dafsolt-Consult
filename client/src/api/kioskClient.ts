import axios from "axios";

// Deliberately its own token key and axios instance, isolated from both the
// regular tenant client (api/client.ts, "dafsolt.accessToken") and the
// platform-admin client (api/platformClient.ts) — a kiosk session must
// never be readable by, or collide with, a real logged-in session on the
// same shared kiosk PC. No refresh token: kiosk sessions are short-lived by
// design (see server/src/utils/kioskJwt.ts) and re-login is cheap/expected.
const ACCESS_TOKEN_KEY = "dafsolt.kiosk.accessToken";

export const kioskTokenStore = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(ACCESS_TOKEN_KEY),
};

export const kioskApi = axios.create({ baseURL: "/api/cbt-kiosk" });

kioskApi.interceptors.request.use((config) => {
  const token = kioskTokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

kioskApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.includes("/login")) {
      kioskTokenStore.clear();
      window.location.href = "/kiosk/login";
    }
    return Promise.reject(error);
  }
);
