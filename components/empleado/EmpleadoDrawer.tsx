"use client";

import Drawer from "@/components/ui/Drawer";
import { CalendarDays, ClipboardList, Plane, Stethoscope } from "lucide-react";
import { ReactNode } from "react";

type Screen = {
  key: string;
  title: string;
  content: ReactNode;
};

function Row({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left",
        "px-4 py-3",
        "flex items-center gap-3",
        "active:bg-gray-100 transition",
      ].join(" ")}
    >
      <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
        {icon}
      </div>

      <div className="flex-1">
        <div className="text-[15px] font-semibold text-gray-900">{title}</div>
        {subtitle ? (
          <div className="text-[13px] text-gray-500 mt-0.5">{subtitle}</div>
        ) : null}
      </div>

      <div className="text-gray-400">›</div>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-3 pt-4">
      <div className="px-1 pb-2 text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
        {title}
      </div>
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function EmpleadoDrawer({
  open,
  onClose,
  goTo, // push de navegación
}: {
  open: boolean;
  onClose: () => void;
  goTo: (s: Screen) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose}>
      {/* Contenido tipo iOS */}
      <div className="h-full bg-gray-50">
        {/* “Hero” superior */}
        <div className="px-4 pt-5 pb-3">
          <div className="text-[18px] font-bold text-gray-900">
            Acciones del empleado
          </div>
          <div className="text-[13px] text-gray-500 mt-1">
            Calendario, vacaciones, bajas y solicitudes.
          </div>
        </div>

        <Section title="Calendario y ausencias">
          <Row
            icon={<CalendarDays size={18} className="text-gray-700" />}
            title="Calendario laboral"
            subtitle="Festivos, vacaciones y bajas"
            onClick={() =>
              goTo({
                key: "cal",
                title: "Calendario",
                content: (
                  <div className="p-4 text-sm text-gray-600">
                    Aquí irá FullCalendar del empleado (ya lo tienes).
                  </div>
                ),
              })
            }
          />
          <div className="h-px bg-black/5" />
          <Row
            icon={<Plane size={18} className="text-gray-700" />}
            title="Solicitar vacaciones"
            subtitle="Enviar solicitud al administrador"
            onClick={() =>
              goTo({
                key: "vac",
                title: "Vacaciones",
                content: (
                  <div className="p-4 text-sm text-gray-600">
                    Aquí irá el formulario iOS de vacaciones.
                  </div>
                ),
              })
            }
          />
          <div className="h-px bg-black/5" />
          <Row
            icon={<Stethoscope size={18} className="text-gray-700" />}
            title="Solicitar baja médica"
            subtitle="Con adjuntos (PDF/PNG)"
            onClick={() =>
              goTo({
                key: "baja",
                title: "Baja médica",
                content: (
                  <div className="p-4 text-sm text-gray-600">
                    Aquí irá el formulario iOS de baja + adjuntos.
                  </div>
                ),
              })
            }
          />
        </Section>

        <Section title="Seguimiento">
          <Row
            icon={<ClipboardList size={18} className="text-gray-700" />}
            title="Mis solicitudes"
            subtitle="Pendientes, aprobadas, rechazadas"
            onClick={() =>
              goTo({
                key: "mis",
                title: "Mis solicitudes",
                content: (
                  <div className="p-4 text-sm text-gray-600">
                    Aquí irá el listado de ausencias del empleado.
                  </div>
                ),
              })
            }
          />
        </Section>

        <div className="h-6" />
      </div>
    </Drawer>
  );
}
