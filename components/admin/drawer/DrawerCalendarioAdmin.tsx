// src/components/admin/drawer/DrawerCalendarioAdmin.tsx
"use client";

import IOSDrawer from "@/components/ui/IOSDrawer";
import AdminCalendarioBase from "@/components/admin/drawer/AdminCalendarioBase";

export default function DrawerCalendarioAdmin({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <IOSDrawer
      open={open}
      onClose={onClose}
      header={{
        title: "Calendario",
        canGoBack: true,
        onBack: onClose,
        onClose,
      }}
    >
      <AdminCalendarioBase mode="mobile" />
    </IOSDrawer>
  );
}
