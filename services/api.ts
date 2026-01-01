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
// INTERCEPTOR DE ERROR
// ===============================
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined" && err?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

// Para cada petición leemos SIEMPRE el token almacenado
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
