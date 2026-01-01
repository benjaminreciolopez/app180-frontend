// services/turnos.ts
import { api } from "./api";

export async function getTurnos() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  console.log("TOKEN EN TURNOS:", token);

  const res = await api.get("/turnos", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return res.data;
}

export async function getTurno(id: string) {
  // backend: router.get("/detalle/:id", getTurno);
  const res = await api.get(`/turnos/detalle/${id}`);
  return res.data;
}

export async function createTurno(data: any) {
  const res = await api.post("/turnos", data);
  return res.data;
}

export async function updateTurno(id: string, data: any) {
  const res = await api.put(`/turnos/${id}`, data);
  return res.data;
}

export async function deleteTurno(id: string) {
  const res = await api.delete(`/turnos/${id}`);
  return res.data;
}
