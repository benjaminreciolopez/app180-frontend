// services/api.ts
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  // ❌ NO withCredentials (usamos JWT en header, no cookies)
});

// ======================================================
// REQUEST INTERCEPTOR → AÑADE EL TOKEN SIEMPRE
// ======================================================
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// ======================================================
// RESPONSE INTERCEPTOR → CONTROL DE SEGURIDAD GLOBAL
// ======================================================
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined") {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      // 🔐 PASSWORD FORZADA (empleados)
      if (code === "PASSWORD_FORCED") {
        window.dispatchEvent(new CustomEvent("password-forced"));
        return Promise.reject(err);
      }

      // 🔒 TOKEN INVÁLIDO / EXPIRADO
      if (status === 401) {
        const url = err?.config?.url || "";

        // 🔐 SOLO LOGOUT si falla auth REAL
        if (
          url.startsWith("/auth") ||
          url === "/empleado/dashboard" ||
          url === "/admin/dashboard"
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(err);
  }
);

// ======================================================
// HELPER OPCIONAL (login / logout)
// ======================================================
export function setAuthToken(token?: string | null) {
  if (typeof window === "undefined") return;

  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
  }
}
