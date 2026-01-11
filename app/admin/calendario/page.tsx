// app/admin/calendario/page.tsx
"use client";

import AdminCalendarioBase from "@/components/admin/drawer/AdminCalendarioBase";

export default function CalendarioPage() {
  return (
    <div className="p-6">
      <div style={{ background: "red", color: "white", padding: 20 }}>
        DEBUG PAGE — VERSION NUEVA
      </div>
      <AdminCalendarioBase />
    </div>
  );
}
