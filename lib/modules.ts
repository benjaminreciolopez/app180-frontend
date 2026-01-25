export function hasModule(name: string): boolean {
  if (typeof window === "undefined") return false;

  const raw = localStorage.getItem("user");
  if (!raw) return false;

  try {
    const u = JSON.parse(raw);
    return u.modulos?.[name] !== false;
  } catch {
    return false;
  }
}
