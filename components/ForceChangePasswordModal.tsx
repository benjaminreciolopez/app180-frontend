// app180-frontend/components/ForceChangePasswordModal.tsx

"use client";

import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/services/api";

export default function ForceChangePasswordModal() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;

    try {
      const user = JSON.parse(raw);
      if (user.password_forced === true) {
        setVisible(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await api.post("/auth/change-password", {
        current_password: current,
        new_password: next,
      });

      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setAuthToken(token);

      // 🔓 desbloqueado
      setVisible(false);
      // 🔓 desbloqueado → recargar app
      window.location.reload();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Error al cambiar contraseña");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-2">
          Cambio de contraseña obligatorio
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Por seguridad, debes cambiar tu contraseña antes de continuar.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Contraseña actual
            </label>
            <input
              type="password"
              className="border rounded w-full px-3 py-2"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Nueva contraseña
            </label>
            <input
              type="password"
              className="border rounded w-full px-3 py-2"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
