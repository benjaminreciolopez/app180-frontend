// services/auth.ts
import { api, setAuthToken } from "./api";
import { jwtDecode, JwtPayload } from "jwt-decode";

export interface AppJwtPayload extends JwtPayload {
  id: string;
  email: string;
  role: "admin" | "empleado";
  nombre: string;
  empleado_id?: string | null;
  device_hash?: string | null;
  password_forced?: boolean;
}

export async function login(
  email: string,
  password: string,
  device_hash?: string
) {
  console.log("[login] enviando credenciales", {
    email,
    hasDeviceHash: !!device_hash,
  });

  let hash: string | undefined;

  if (typeof window !== "undefined") {
    // 1️⃣ si viene como parámetro → prioridad máxima
    if (device_hash && device_hash !== "") {
      hash = device_hash;
    } else {
      // 2️⃣ intentar leer de localStorage
      const stored = localStorage.getItem("device_hash");
      if (stored && stored !== "") {
        hash = stored;
      } else {
        // 3️⃣ intentar recuperar desde backend
        try {
          const res = await api.get("/empleado/device-hash");
          if (res.data?.device_hash) {
            hash = res.data.device_hash;
            localStorage.setItem("device_hash", hash!);
          }
        } catch {
          // ignorar errores silenciosamente
        }

        // 4️⃣ si sigue sin existir → generar nuevo
        if (!hash) {
          hash =
            (crypto as any)?.randomUUID?.() ||
            Math.random().toString(36).substring(2);

          localStorage.setItem("device_hash", hash!);
        }
      }
    }
  } else {
    // fallback SSR
    hash = "server-generated-" + Math.random().toString(36).substring(2);
  }

  console.log("[login] usando device_hash", hash);

  const res = await api.post("/auth/login", {
    email,
    password,
    device_hash: hash!, // <- afirmamos que es string
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  });

  console.log("[login] respuesta backend", res.data);

  const { token, user } = res.data;

  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }

  setAuthToken(token);

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
// DECODIFICAR TOKEN
// =================================
export function getUserFromToken(token: string) {
  const decoded = jwtDecode<AppJwtPayload>(token);

  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    nombre: decoded.nombre,
    empleadoId: decoded.empleado_id || null,
  };
}
