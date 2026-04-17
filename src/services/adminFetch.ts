import {
  getAdminAccessToken,
  clearAdminSession,
  refreshAdminToken,
} from "./authService";

const API_BASE_URL = "http://localhost:5167/api";

export async function adminFetch(endpoint: string, options: RequestInit = {}) {
  let token = getAdminAccessToken();

  const buildHeaders = () => {
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };

    const hasBody = options.body !== undefined && options.body !== null;
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    if (hasBody && !isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  };

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(),
  });

  if (response.status === 401) {
    const refreshed = await refreshAdminToken();

    if (!refreshed) {
      clearAdminSession();
      window.location.href = "/admin/login";
      throw new Error("Unauthorized");
    }

    token = getAdminAccessToken();

    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: buildHeaders(),
    });
  }

  return response;
}