const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5167/api";

const ACCESS_TOKEN_KEY = "admin_access_token";
const REFRESH_TOKEN_KEY = "admin_refresh_token";
const ACCESS_TOKEN_EXPIRES_KEY = "admin_access_token_expires_at";

export type AdminLoginPayload = {
  email: string;
  password: string;
};

export type AdminAuthResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
};

export async function adminLogin(
  payload: AdminLoginPayload
): Promise<AdminAuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

export function saveAdminSession(data: AdminAuthResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, data.accessTokenExpiresAtUtc);
}

export function getAdminAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAdminToken() {
  return getAdminAccessToken();
}

export function getAdminRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAccessTokenExpiry() {
  return localStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY);
}

export function clearAdminSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
}

export function removeAdminToken() {
  clearAdminSession();
}

export function isAccessTokenStillValid() {
  const expiry = getAccessTokenExpiry();
  if (!expiry) return false;

  return new Date(expiry).getTime() > Date.now();
}

export function isAdminAuthenticated() {
  return !!getAdminAccessToken() && !!getAdminRefreshToken();
}

export async function refreshAdminToken(): Promise<boolean> {
  const refreshToken = getAdminRefreshToken();

  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearAdminSession();
    return false;
  }

  const data: AdminAuthResponse = await response.json();
  saveAdminSession(data);
  return true;
}

export async function adminLogout() {
  const refreshToken = getAdminRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
    }
  }

  clearAdminSession();
}