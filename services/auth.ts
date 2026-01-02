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
}

// =================================
// LOGIN
// =================================
export async function login(
  email: string,
  password: string,
  device_hash?: string
) {
  console.log("[login] enviando credenciales", {
    email,
    hasDeviceHash: !!device_hash,
  });

  let hash: string;

  if (typeof window !== "undefined") {
    // 1️⃣ Si viene como parámetro → úsalo
    if (device_hash && device_hash !== "") {
      hash = device_hash;
    } else {
      // 2️⃣ Intentar recuperar existente
      const stored = localStorage.getItem("device_hash");

      if (stored && stored !== "") {
        hash = stored;
      } else {
        // 3️⃣ Si no existe → crear uno válido
        hash =
          (crypto as any)?.randomUUID?.() ||
          Math.random().toString(36).substring(2);

        localStorage.setItem("device_hash", hash);
      }
    }
  } else {
    // fallback por si se ejecuta SSR
    hash = "server-generated-device-" + Math.random().toString(36).substring(2);
  }

  console.log("[login] usando device_hash", hash);

  const res = await api.post("/auth/login", {
    email,
    password,
    device_hash: hash,
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
