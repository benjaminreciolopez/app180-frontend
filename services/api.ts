// services/api.ts
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
});

// Al cargar, intentar poner el token actual
if (typeof window !== "undefined") {
  const token = localStorage.getItem("token");
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }
}

// ===============================
// JWT TOKEN MANAGEMENT
// ===============================
export function setAuthToken(token?: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

// ===============================
// INTERCEPTOR DE ERROR (CLAVE)
// ===============================
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined") {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      // 🔐 BLOQUEO POR PASSWORD FORZADA
      if (code === "PASSWORD_FORCED") {
        window.dispatchEvent(new CustomEvent("password-forced"));
        return Promise.reject(err);
      }

      // 🔒 TOKEN INVÁLIDO / EXPIRADO
      if (status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  }
);

// ===============================
// REQUEST INTERCEPTOR
// ===============================
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
