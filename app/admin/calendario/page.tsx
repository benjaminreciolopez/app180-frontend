"use client";

import { useState } from "react";
import IOSDrawer from "@/components/ui/IOSDrawer";
import DrawerCalendarioAdmin from "@/components/admin/drawer/DrawerCalendarioAdmin";

export default function AdminCalendarioPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendario laboral</h1>

      <IOSDrawer
        open={open}
        onClose={() => setOpen(false)}
        header={{
          title: "Calendario",
          canGoBack: false,
          onBack: () => {},
          onClose: () => setOpen(false),
        }}
      >
        <DrawerCalendarioAdmin />
      </IOSDrawer>
    </div>
  );
}
