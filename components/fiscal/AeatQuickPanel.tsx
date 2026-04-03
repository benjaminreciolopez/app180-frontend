"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Shield,
  CalendarDays,
  Building2,
  UserPlus,
  UserMinus,
  Search,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { GENERAL_LINKS } from "./AeatModelLinks";

interface Presentation {
  modelo: string;
  periodo: string;
  ejercicio: number;
  estado: string;
  fecha_presentacion?: string;
}

interface AeatQuickPanelProps {
  year: string;
  collapsed?: boolean;
}

const DEADLINES = [
  { modelo: "303", periodo: "1T", limite: "04-20", label: "Modelo 303 - 1T" },
  { modelo: "303", periodo: "2T", limite: "07-20", label: "Modelo 303 - 2T" },
  { modelo: "303", periodo: "3T", limite: "10-20", label: "Modelo 303 - 3T" },
  { modelo: "303", periodo: "4T", limite: "01-30", label: "Modelo 303 - 4T", yearOffset: 1 },
  { modelo: "130", periodo: "1T", limite: "04-20", label: "Modelo 130 - 1T" },
  { modelo: "130", periodo: "2T", limite: "07-20", label: "Modelo 130 - 2T" },
  { modelo: "130", periodo: "3T", limite: "10-20", label: "Modelo 130 - 3T" },
  { modelo: "130", periodo: "4T", limite: "01-30", label: "Modelo 130 - 4T", yearOffset: 1 },
  { modelo: "111", periodo: "1T", limite: "04-20", label: "Modelo 111 - 1T" },
  { modelo: "111", periodo: "2T", limite: "07-20", label: "Modelo 111 - 2T" },
  { modelo: "111", periodo: "3T", limite: "10-20", label: "Modelo 111 - 3T" },
  { modelo: "111", periodo: "4T", limite: "01-30", label: "Modelo 111 - 4T", yearOffset: 1 },
  { modelo: "115", periodo: "1T", limite: "04-20", label: "Modelo 115 - 1T" },
  { modelo: "115", periodo: "2T", limite: "07-20", label: "Modelo 115 - 2T" },
  { modelo: "115", periodo: "3T", limite: "10-20", label: "Modelo 115 - 3T" },
  { modelo: "115", periodo: "4T", limite: "01-30", label: "Modelo 115 - 4T", yearOffset: 1 },
];

function getDeadlineDate(dl: typeof DEADLINES[number], baseYear: number): Date {
  const y = dl.yearOffset ? baseYear + dl.yearOffset : baseYear;
  const [month, day] = dl.limite.split("-").map(Number);
  return new Date(y, month - 1, day);
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AeatQuickPanel({ year, collapsed: initialCollapsed = true }: AeatQuickPanelProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [presentations, setPresentations] = useState<Presentation[]>([]);

  useEffect(() => {
    loadPresentations();
  }, [year]);

  const loadPresentations = async () => {
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/calendario/${year}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPresentations(json.data || []);
        }
      }
    } catch {
      // Silently fail - panel is informational
    }
  };

  const baseYear = parseInt(year);
  const now = new Date();

  // Get upcoming deadlines (next 90 days)
  const upcoming = DEADLINES
    .map((dl) => {
      const date = getDeadlineDate(dl, baseYear);
      const days = daysUntil(date);
      const presented = presentations.some(
        (p) => p.modelo === dl.modelo && p.periodo === dl.periodo && p.estado === "PRESENTADO"
      );
      return { ...dl, date, days, presented };
    })
    .filter((dl) => dl.days >= -7 && dl.days <= 90)
    .sort((a, b) => a.days - b.days);

  const recentPresentations = presentations
    .filter((p) => p.estado === "PRESENTADO")
    .slice(0, 5);

  return (
    <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            AEAT - Sede Electronica
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4 pt-0">
          {/* Quick access links */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Acceso rapido</p>
            <div className="grid grid-cols-2 gap-1.5">
              <a
                href={GENERAL_LINKS.sede}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs bg-white border hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="h-3 w-3 text-blue-500" />
                Sede Electronica
              </a>
              <a
                href={GENERAL_LINKS.certificado}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs bg-white border hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Shield className="h-3 w-3 text-green-500" />
                Certificado digital
              </a>
              <a
                href={GENERAL_LINKS.censoAlta}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs bg-white border hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <UserPlus className="h-3 w-3 text-emerald-500" />
                Alta censal
              </a>
              <a
                href={GENERAL_LINKS.censoBaja}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs bg-white border hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <UserMinus className="h-3 w-3 text-red-500" />
                Baja censal
              </a>
              <a
                href={GENERAL_LINKS.calendario}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs bg-white border hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <CalendarDays className="h-3 w-3 text-orange-500" />
                Calendario fiscal
              </a>
              <a
                href={GENERAL_LINKS.renta}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs bg-white border hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Search className="h-3 w-3 text-purple-500" />
                Renta / IRPF
              </a>
            </div>
          </div>

          {/* Upcoming deadlines */}
          {upcoming.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Proximos vencimientos</p>
              <div className="space-y-1">
                {upcoming.slice(0, 6).map((dl, i) => {
                  let color = "text-slate-500 bg-slate-50";
                  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
                  if (dl.presented) {
                    color = "text-green-700 bg-green-50";
                    badgeVariant = "default";
                  } else if (dl.days < 0) {
                    color = "text-red-700 bg-red-50";
                    badgeVariant = "destructive";
                  } else if (dl.days <= 30) {
                    color = "text-amber-700 bg-amber-50";
                    badgeVariant = "secondary";
                  }

                  return (
                    <div
                      key={`${dl.modelo}-${dl.periodo}-${i}`}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs ${color}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {dl.presented ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span className="font-medium">{dl.label}</span>
                      </div>
                      <Badge variant={badgeVariant} className="text-[10px] h-5">
                        {dl.presented
                          ? "Presentado"
                          : dl.days < 0
                            ? `Vencido (${Math.abs(dl.days)}d)`
                            : dl.days === 0
                              ? "Hoy"
                              : `${dl.days}d`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent presentations */}
          {recentPresentations.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Presentaciones recientes</p>
              <div className="space-y-1">
                {recentPresentations.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs bg-green-50 text-green-700"
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="font-medium">
                        Modelo {p.modelo} - {p.periodo}
                      </span>
                    </div>
                    <span className="text-[10px] text-green-600">{p.ejercicio}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
