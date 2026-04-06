"use client";

import { ExternalLink, Send, Search, CalendarDays, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ModelLinks = {
  presentar: string;
  consultar: string;
  calendario?: string;
  info: string;
};

const AEAT_LINKS: Record<string, ModelLinks> = {
  "303": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/G414.shtml",
    calendario: "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente.html",
    info: "IVA - Autoliquidacion trimestral",
  },
  "390": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G412.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/G412.shtml",
    info: "IVA - Resumen anual",
  },
  "130": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/G601.shtml",
    info: "IRPF - Pago fraccionado estimacion directa",
  },
  "111": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH01.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/GH01.shtml",
    info: "Retenciones e ingresos a cuenta - Rendimientos del trabajo",
  },
  "115": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH02.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/GH02.shtml",
    info: "Retenciones - Arrendamiento inmuebles urbanos",
  },
  "190": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI10.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/GI10.shtml",
    info: "Resumen anual retenciones e ingresos a cuenta",
  },
  "180": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI00.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/GI00.shtml",
    info: "Resumen anual retenciones arrendamiento",
  },
  "347": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/GI27.shtml",
    info: "Declaracion anual operaciones con terceros",
  },
  "349": {
    presentar: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI28.shtml",
    consultar: "https://sede.agenciatributaria.gob.es/Sede/tramitacion/GI28.shtml",
    info: "Operaciones intracomunitarias",
  },
};

const GENERAL_LINKS = {
  sede: "https://sede.agenciatributaria.gob.es",
  certificado: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC27.shtml",
  calendario: "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente.html",
  renta: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC07.shtml",
  censoAlta: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G612.shtml",
  censoBaja: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G613.shtml",
};

const PLAZOS: Record<string, string> = {
  "1T": "1-20 abril",
  "2T": "1-20 julio",
  "3T": "1-20 octubre",
  "4T": "1-30 enero (del siguiente)",
};

const PLAZOS_ANUALES: Record<string, string> = {
  "390": "Enero (hasta 30)",
  "190": "Enero (hasta 31)",
  "180": "Enero (hasta 31)",
  "347": "Febrero (hasta 28)",
  "349": "Enero (hasta 30)",
};

const MODELOS_ANUALES = ["390", "190", "180", "347"];

interface AeatModelLinksProps {
  modelo: string;
  trimestre?: string;
}

export default function AeatModelLinks({ modelo, trimestre }: AeatModelLinksProps) {
  const links = AEAT_LINKS[modelo];
  if (!links) return null;

  const esAnual = MODELOS_ANUALES.includes(modelo);
  const plazo = esAnual
    ? PLAZOS_ANUALES[modelo] || "Enero-Febrero"
    : trimestre
      ? PLAZOS[`${trimestre}T`]
      : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
          <ExternalLink className="h-3.5 w-3.5" />
          AEAT
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b bg-slate-50">
          <p className="text-xs font-semibold text-slate-700">Modelo {modelo}</p>
          <p className="text-xs text-muted-foreground">{links.info}</p>
          {plazo && (
            <Badge variant="outline" className="mt-1.5 text-[10px]">
              <CalendarDays className="h-3 w-3 mr-1" /> Plazo: {plazo}
            </Badge>
          )}
        </div>
        <div className="p-2 space-y-1">
          <a
            href={links.presentar}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-blue-50 text-slate-700 transition-colors"
          >
            <Send className="h-4 w-4 text-blue-600" />
            Presentar en AEAT
          </a>
          <a
            href={links.consultar}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <Search className="h-4 w-4 text-slate-500" />
            Consultar presentaciones
          </a>
          <a
            href={GENERAL_LINKS.calendario}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Calendario contribuyente
          </a>
        </div>
        <div className="p-2 border-t">
          <a
            href={GENERAL_LINKS.sede}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-blue-600 transition-colors"
          >
            <Info className="h-3 w-3" />
            Sede Electronica AEAT
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { AEAT_LINKS, GENERAL_LINKS };
