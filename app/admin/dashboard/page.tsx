"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    empleados: 0,
    fichajesHoy: 0,
    sospechosos: 0,
  });

  async function loadData() {
    try {
      const [empleadosRes, fichajesHoyRes, sospechososRes] = await Promise.all([
        api.get("/employees"),
        api.get("/fichajes/hoy"),
        api.get("/fichajes/sospechosos"),
      ]);

      setStats({
        empleados: empleadosRes.data.length || 0,
        fichajesHoy: fichajesHoyRes.data.length || 0,
        sospechosos: sospechososRes.data.length || 0,
      });
    } catch (e) {
      console.error("Error cargando dashboard", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-gray-500 text-sm">Empleados activos</h3>
          <p className="text-4xl font-bold">{stats.empleados}</p>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-gray-500 text-sm">Fichajes de hoy</h3>
          <p className="text-4xl font-bold">{stats.fichajesHoy}</p>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-gray-500 text-sm">Fichajes sospechosos</h3>
          <p className="text-4xl font-bold text-red-600">{stats.sospechosos}</p>
        </div>
      </div>
    </div>
  );
}
