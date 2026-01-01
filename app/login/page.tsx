"use client";

import { useState } from "react";
import { login } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: any) {
    e.preventDefault();

    try {
      const res = await login(email, password, "web-device");

      // 👇 Muy importante
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      // si usas api de axios
      // api.defaults.headers.common["Authorization"] = `Bearer ${res.token}`;

      const role = res.decoded.role;

      if (role === "admin") window.location.href = "/admin/dashboard";
      else if (role === "empleado") window.location.href = "/empleado/fichar";
      else window.location.href = "/";
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error login");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow p-8 rounded w-96 space-y-3"
      >
        <h1 className="text-xl font-bold">APP180 Login</h1>

        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
        />

        <Button className="w-full" type="submit">
          Entrar
        </Button>
      </form>
    </main>
  );
}
