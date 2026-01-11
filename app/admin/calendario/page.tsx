// app/admin/calendario/page.tsx
"use client";

import AdminCalendarioBase from "@/components/admin/drawer/AdminCalendarioBase";

export default function CalendarioAdminPage() {
  return (
    <div className="p-6">
      <AdminCalendarioBase mode="desktop" />
    </div>
  );
}
