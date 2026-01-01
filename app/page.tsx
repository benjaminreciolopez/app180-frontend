"use client";

import { login } from "../services/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const result = await login(email, password);

      if (result.decoded.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/empleado");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al iniciar sesión");
    }
  }

  return (
    <form onSubmit={handleLogin}>
      {/* tus inputs ya existentes */}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
