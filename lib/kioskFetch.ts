// lib/kioskFetch.ts
// Utilidad de fetch para dispositivos kiosko.
// Usa KioskToken en lugar de Bearer JWT.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";

export function getKioskToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("kiosk_device_token");
}

export function setKioskToken(token: string) {
  localStorage.setItem("kiosk_device_token", token);
}

export function clearKioskToken() {
  localStorage.removeItem("kiosk_device_token");
}

export async function kioskFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getKioskToken();

  if (!token) {
    throw new Error("KIOSK_NOT_CONFIGURED");
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `KioskToken ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    throw new Error("KIOSK_UNAUTHORIZED");
  }

  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Dispositivo desactivado");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }

  return res.json();
}
