"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import DrawerCalendarioAdmin from "./DrawerCalendarioAdmin";
import CalendarioDesktop from "./CalendarioDesktop";

type Props = {
  mode?: "mobile" | "desktop";
};

export default function AdminCalendarioBase({ mode }: Props) {
  const autoMobile = useIsMobile();

  const finalMode = mode ?? (autoMobile ? "mobile" : "desktop");

  if (finalMode === "mobile") {
    return <DrawerCalendarioAdmin open={true} onClose={() => {}} />;
  }

  return <CalendarioDesktop />;
}
