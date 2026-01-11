"use client";

import IOSDrawer from "@/components/ui/IOSDrawer";
import CalendarioDesktop from "./CalendarioDesktop";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function DrawerCalendarioAdmin({ open, onClose }: Props) {
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
      <CalendarioDesktop />
    </IOSDrawer>
  );
}
