// services/auth.ts
import { api, setAuthToken } from "./api";
import { jwtDecode, JwtPayload } from "jwt-decode";

export interface AppJwtPayload extends JwtPayload {
  id: string;
  email: string;
  role: "admin" | "empleado";
  nombre: string;
  avatar_url?: string | null;
  empleado_id?: string | null;
  device_hash?: string | null;
  password_forced?: boolean;
}

export async function login(
  email: string,
  password: string,
  device_hash?: string,
  remember: boolean = false,
): Promise<{
  token: string;
  user: any;
  decoded: AppJwtPayload;
  mustChangePassword: boolean;
}> {
  console.log("[login] enviando credenciales", {
    email,
    hasDeviceHash: !!device_hash,
  });

  // ✅ valor por defecto SIEMPRE válido
  let hash: string =
    crypto.randomUUID?.() || Math.random().toString(36).substring(2);

  // =========================
  // DEVICE HASH
  // =========================
  if (typeof window !== "undefined") {
    if (device_hash && device_hash !== "") {
      hash = device_hash;
    } else {
      const stored = localStorage.getItem("device_hash");

      if (stored) {
        hash = stored;
      } else {
        try {
          const res = await api.get("/empleado/device-hash");

          if (res.data?.device_hash) {
            hash = res.data.device_hash;
            localStorage.setItem("device_hash", hash);
          }
        } catch {
          // ignore
        }

        // guardar el generado si no vino de backend
        localStorage.setItem("device_hash", hash);
      }
    }
  }

  console.log("[login] usando device_hash", hash);

  // =========================
  // LOGIN REQUEST
  // =========================
  let res;

  try {
    res = await api.post("/auth/login", {
      email,
      password,
      device_hash: hash,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    });
  } catch (err: any) {
    // 🔥 BOOTSTRAP
    if (
      err?.response?.status === 409 &&
      err?.response?.data?.code === "BOOTSTRAP_REQUIRED"
    ) {
      console.warn("[login] bootstrap requerido");
    }

    // ⛔ Siempre propagar
    throw err;
  }

  console.log("[login] respuesta backend", res.data);

  const { token, user } = res.data;

  // =========================
  // STORAGE
  // =========================
  // =========================
  // STORAGE
  // =========================
  if (typeof window !== "undefined") {
    if (remember) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      // Limpiar session por si acaso
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
    } else {
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      // Limpiar local por si acaso
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  setAuthToken(token);

  // =========================
  // DECODE
  // =========================
  const decoded = jwtDecode<AppJwtPayload>(token);

  console.log("[login] token decodificado", decoded);

  return {
    token,
    user,
    decoded,
    mustChangePassword:
      decoded.role === "empleado" && decoded.password_forced === true,
  };
}

// =================================
// HELPERS STORAGE (Local vs Session)
// =================================

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

export function getUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === "undefined") return;

  // 🔒 Registro Veri*Factu: Logout explícito
  const token = getToken();
  if (token) {
    try {
      // Intentamos registrar el evento antes de limpiar el token
      // Usamos fetch directo o un helper si es posible para asegurar que se envía
      api.post("/admin/facturacion/configuracion/verifactu/eventos", {
        tipoEvento: 'CIERRE_SESION',
        descripcion: 'Cierre de sesión voluntario del usuario'
      }).catch(() => { /* ignore silent fail */ });
    } catch (e) {
      console.error("Error registrando log de salida", e);
    }
  }

  // Limpieza local
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Limpieza sesión (CRÍTICO para evitar persistencia de modo móvil erróneo)
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("desktop_mode_fix_attempted_v5");

  setAuthToken(null);
  window.dispatchEvent(new Event("session-updated"));
  window.location.href = "/";
}

/**
 * Registra el cierre de la aplicación (ventana/pestaña)
 * Se llama desde AuthInit o RootLayout
 */
export function registerAppClose() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/facturacion/configuracion/verifactu/eventos`;
  const token = getToken();

  if (!token) return;

  const data = JSON.stringify({
    tipoEvento: 'CIERRE_APP',
    descripcion: 'Cierre de la ventana/pestaña de la aplicación'
  });

  // Usamos sendBeacon para asegurar que la petición se envíe incluso al cerrar la pestaña
  // Nota: sendBeacon no soporta headers personalizados (como Authorization) fácilmente
  // pero podemos pasar el token en la URL o usar fetch con keepalive
  try {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: data,
      keepalive: true
    }).catch(() => { });
  } catch (e) { }
}

export function getUserFromToken(token: string) {
  const decoded = jwtDecode<AppJwtPayload>(token);

  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    nombre: decoded.nombre,
    avatar_url: decoded.avatar_url || null,
    empleadoId: decoded.empleado_id || null,
  };
}

export function updateStoredUser(user: any) {
  if (typeof window === "undefined") return;

  // Si hay token en local, actualizamos user en local. Si no, en session.
  if (localStorage.getItem("token")) {
    localStorage.setItem("user", JSON.stringify(user));
  }
  if (sessionStorage.getItem("token")) {
    sessionStorage.setItem("user", JSON.stringify(user));
  }

  // Notificar a la app que la sesión ha cambiado (Dashboard, Sidebar, etc.)
  window.dispatchEvent(new Event("session-updated"));
}

// =================================
// DEVICE HASH HELPER
// =================================
export const getOrGenerateDeviceHash = (): string => {
  if (typeof window === "undefined") return "";

  let hash = localStorage.getItem("device_hash");

  if (!hash) {
    // Intentar obtener de crypto o fallback random
    hash = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
    localStorage.setItem("device_hash", hash);
  }

  return hash;
};

// =================================
// REFRESH
// =================================
export async function refreshMe() {
  const r = await api.get("/auth/me");
  updateStoredUser(r.data);
  return r.data;
}
