"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { DashboardData } from "@/types/dashboard";
import { isMobileDevice, isStandalone } from "@/utils/pwaDetection";

interface WidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

interface DashboardResult {
  data: DashboardData;
  widgets: WidgetConfig[];
  modulos: Record<string, boolean>;
}

const DASHBOARD_KEY = ["admin", "dashboard"] as const;

function getIsMobileProfile() {
  if (typeof window === "undefined") return false;
  const isLargeScreen = window.innerWidth >= 1024;
  const isPwaMobile = isMobileDevice() && isStandalone();
  return isPwaMobile && !isLargeScreen;
}

async function fetchDashboard(): Promise<DashboardResult> {
  const useMobileProfile = getIsMobileProfile();

  const [dashRes, widgetRes, modsRes] = await Promise.all([
    api.get("/api/admin/dashboard"),
    api.get("/admin/configuracion/widgets").catch(() => ({ data: { widgets: [] } })),
    api.get(useMobileProfile ? "/auth/me/modules?mobile=true" : "/auth/me/modules").catch(() => ({ data: {} })),
  ]);

  let w: WidgetConfig[] = useMobileProfile
    ? (widgetRes.data?.widgets_mobile || [])
    : (widgetRes.data?.widgets || []);

  if (w.length === 0) {
    // Will use ALL_DASHBOARD_WIDGETS default in the component
    w = [];
  }

  return {
    data: dashRes.data as DashboardData,
    widgets: w,
    modulos: modsRes.data || {},
  };
}

export function useDashboard() {
  const qc = useQueryClient();

  const query = useQuery<DashboardResult>({
    queryKey: DASHBOARD_KEY,
    queryFn: fetchDashboard,
    staleTime: 60 * 1000, // 1 min - dashboard data refreshes less aggressively
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
  };

  return {
    dashData: query.data?.data ?? null,
    widgets: query.data?.widgets ?? [],
    modulos: query.data?.modulos ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error ? (query.error as Error).message : null,
    refetch,
  };
}
