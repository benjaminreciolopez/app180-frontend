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
  const res = await api.post("/auth/login", {
    email,
    password,
    device_hash,
  });

  const { token, user } = res.data;

  localStorage.setItem("token", token);
  setAuthToken(token);

  const decoded = jwtDecode<AppJwtPayload>(token);

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
