"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { getUser } from "@/services/auth";
import { showSuccess, showError } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ──
interface MCPUser {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  app: string;
  ai_enabled: boolean;
  created_at: string;
  org_id: string | null;
  org_name: string | null;
  source_app: string;
  ai_calls: number;
  ai_input_tokens: number;
  ai_output_tokens: number;
  ai_cost: number;
  user_quotas: UserQuota[];
}

interface UserQuota {
  id: string;
  app_id: string;
  user_id: string;
  quota_type: string;
  max_calls: number | null;
  max_tokens: number | null;
  max_cost_usd: number | null;
  enabled: boolean;
}

interface ConsumptionSummary {
  totals: Array<{
    app_id: string;
    total_calls: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost: number;
  }>;
  byProvider: Array<{
    app_id: string;
    provider: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cost: number;
  }>;
}

interface ProviderCredit {
  provider: string;
  initial_amount: number;
  credit_type: string;
  consumed: number;
  remaining: number;
}

interface DailyTrend {
  app_id: string;
  date: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
}

// ── Helpers ──
function formatTokens(n: number | string | null | undefined): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(v);
}

function formatCost(n: number | string | null | undefined): string {
  return (Number(n) || 0).toFixed(4) + " €";
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

// ── Main Component ──
export default function MCPPage() {
  const user = getUser();
  const isFabricante = user?.es_fabricante === true;

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "consumption" | "credits">("users");
  const [users, setUsers] = useState<MCPUser[]>([]);
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [consumption, setConsumption] = useState<ConsumptionSummary | null>(null);
  const [credits, setCredits] = useState<ProviderCredit[]>([]);
  const [trend, setTrend] = useState<DailyTrend[]>([]);
  const [period, setPeriod] = useState("month");
  const [selectedUser, setSelectedUser] = useState<MCPUser | null>(null);
  const [quotaForm, setQuotaForm] = useState({ maxCalls: "", quotaType: "daily", targetAppId: "app180" });
  const [editingCredit, setEditingCredit] = useState<string | null>(null);
  const [creditEditValue, setCreditEditValue] = useState("");

  // ── Data Loading ──
  const loadUsers = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (appFilter !== "all") params.app = appFilter;
      if (search) params.search = search;
      const res = await api.get("/admin/ai/mcp/users", { params });
      setUsers(res.data || []);
    } catch {
      showError("Error cargando usuarios");
    }
  }, [appFilter, search]);

  const loadConsumption = useCallback(async () => {
    try {
      const res = await api.get("/admin/ai/mcp/consumption/global", {
        params: { period, app_id: appFilter !== "all" ? appFilter : undefined },
      });
      setConsumption(res.data);
    } catch {
      showError("Error cargando consumo");
    }
  }, [period, appFilter]);

  const loadCredits = useCallback(async () => {
    try {
      const res = await api.get("/admin/ai/mcp/provider-credits");
      setCredits(res.data || []);
    } catch {
      showError("Error cargando creditos");
    }
  }, []);

  const loadTrend = useCallback(async () => {
    try {
      const res = await api.get("/admin/ai/mcp/trend", {
        params: { days: 30, app_id: appFilter !== "all" ? appFilter : undefined },
      });
      setTrend(res.data || []);
    } catch {
      // silent
    }
  }, [appFilter]);

  useEffect(() => {
    Promise.all([loadUsers(), loadConsumption(), loadCredits(), loadTrend()]).finally(() =>
      setLoading(false)
    );
  }, [loadUsers, loadConsumption, loadCredits, loadTrend]);

  // ── Actions ──
  async function toggleAI(u: MCPUser) {
    try {
      await api.put(`/admin/ai/mcp/users/${u.user_id}/toggle-ai`, {
        sourceApp: u.source_app,
        enabled: !u.ai_enabled,
      });
      showSuccess(`IA ${!u.ai_enabled ? "activada" : "desactivada"} para ${u.full_name || u.email}`);
      loadUsers();
    } catch {
      showError("Error cambiando estado IA");
    }
  }

  async function updateApp(u: MCPUser, newApp: string) {
    try {
      await api.put(`/admin/ai/mcp/users/${u.user_id}/app`, {
        sourceApp: u.source_app,
        app: newApp,
      });
      showSuccess(`App actualizada para ${u.full_name || u.email}`);
      loadUsers();
    } catch {
      showError("Error actualizando app");
    }
  }

  async function saveCredit(provider: string) {
    try {
      await api.put("/admin/ai/mcp/provider-credits", {
        provider,
        initialAmount: parseFloat(creditEditValue) || 0,
        creditType: "credit",
      });
      showSuccess("Credito actualizado");
      setEditingCredit(null);
      loadCredits();
    } catch {
      showError("Error actualizando credito");
    }
  }

  async function saveUserQuota() {
    if (!selectedUser) return;
    try {
      await api.put(`/admin/ai/mcp/users/${selectedUser.user_id}/quotas`, {
        targetAppId: quotaForm.targetAppId,
        quotaType: quotaForm.quotaType,
        maxCalls: quotaForm.maxCalls ? parseInt(quotaForm.maxCalls) : null,
        enabled: true,
      });
      showSuccess("Cuota guardada");
      setSelectedUser(null);
      loadUsers();
    } catch {
      showError("Error guardando cuota");
    }
  }

  // ── Guards ──
  if (!isFabricante) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Acceso denegado</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Stats ──
  const totalCalls = consumption?.totals?.reduce((s, t) => s + Number(t.total_calls), 0) || 0;
  const totalCost = consumption?.totals?.reduce((s, t) => s + Number(t.total_cost), 0) || 0;
  const totalTokens =
    consumption?.totals?.reduce(
      (s, t) => s + Number(t.total_input_tokens) + Number(t.total_output_tokens),
      0
    ) || 0;
  const usersApp180 = users.filter((u) => u.source_app === "app180").length;
  const usersConstructgest = users.filter((u) => u.source_app === "construgest").length;

  return (
    <div className="space-y-6 p-2 sm:p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Control IA Centralizado (MCP)</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona usuarios, consumo y cuotas de IA en app180 y construgest
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Usuarios Totales</p>
          <p className="text-2xl font-bold">{users.length}</p>
          <p className="text-xs text-muted-foreground">
            app180: {usersApp180} | construgest: {usersConstructgest}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Llamadas ({period === "day" ? "hoy" : "mes"})</p>
          <p className="text-2xl font-bold text-purple-600">{totalCalls}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Tokens ({period === "day" ? "hoy" : "mes"})</p>
          <p className="text-2xl font-bold text-blue-600">{formatTokens(totalTokens)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Costo ({period === "day" ? "hoy" : "mes"})</p>
          <p className="text-2xl font-bold text-amber-600">{formatCost(totalCost)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(["users", "consumption", "credits"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "users" ? "Usuarios" : t === "consumption" ? "Consumo" : "Creditos"}
          </button>
        ))}
      </div>

      {/* ── TAB: Usuarios ── */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Buscar por email o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-64"
            />
            <Select value={appFilter} onValueChange={setAppFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las apps</SelectItem>
                <SelectItem value="app180">app180</SelectItem>
                <SelectItem value="construgest">construgest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Usuario</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Org</th>
                  <th className="text-center p-3 font-medium">App</th>
                  <th className="text-right p-3 font-medium">Consumo IA</th>
                  <th className="text-center p-3 font-medium">IA</th>
                  <th className="text-center p-3 font-medium">Cuota</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => {
                  const dailyQuota = u.user_quotas?.find(
                    (q) => q.quota_type === "daily" && q.app_id === u.source_app
                  );
                  return (
                    <tr key={`${u.user_id}-${u.source_app}`} className="hover:bg-muted/30">
                      {/* User */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              className="w-8 h-8 rounded-full"
                              alt=""
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {(u.full_name || u.email || "?")[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {u.full_name || "Sin nombre"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Org */}
                      <td className="p-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {u.org_name || "-"}
                        </span>
                      </td>

                      {/* App */}
                      <td className="p-3 text-center">
                        <Select
                          value={u.app || u.source_app}
                          onValueChange={(v) => updateApp(u, v)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="app180">app180</SelectItem>
                            <SelectItem value="construgest">construgest</SelectItem>
                            <SelectItem value="ambas">ambas</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Consumption */}
                      <td className="p-3 text-right">
                        <div className="text-xs space-y-0.5">
                          <p>
                            <span className="text-purple-600 font-medium">{u.ai_calls}</span>{" "}
                            llamadas
                          </p>
                          <p>
                            <span className="text-blue-600">
                              {formatTokens(u.ai_input_tokens + u.ai_output_tokens)}
                            </span>{" "}
                            tokens
                          </p>
                          {u.ai_cost > 0 && (
                            <p className="text-amber-600 font-medium">
                              {formatCost(u.ai_cost)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* AI Toggle */}
                      <td className="p-3 text-center">
                        <Switch
                          checked={u.ai_enabled}
                          onCheckedChange={() => toggleAI(u)}
                        />
                      </td>

                      {/* Quota */}
                      <td className="p-3 text-center">
                        {dailyQuota ? (
                          <Badge
                            variant="outline"
                            className="cursor-pointer text-xs"
                            onClick={() => {
                              setSelectedUser(u);
                              setQuotaForm({
                                maxCalls: String(dailyQuota.max_calls || ""),
                                quotaType: "daily",
                                targetAppId: u.source_app,
                              });
                            }}
                          >
                            {dailyQuota.max_calls}/dia
                          </Badge>
                        ) : (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedUser(u);
                              setQuotaForm({
                                maxCalls: "",
                                quotaType: "daily",
                                targetAppId: u.source_app,
                              });
                            }}
                          >
                            + cuota
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Quota Modal */}
          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-card border rounded-lg p-6 w-full max-w-md shadow-xl space-y-4">
                <h3 className="font-semibold">
                  Cuota para {selectedUser.full_name || selectedUser.email}
                </h3>
                <p className="text-xs text-muted-foreground">
                  App: {selectedUser.source_app} | Org: {selectedUser.org_name || "-"}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Tipo de cuota</label>
                    <Select
                      value={quotaForm.quotaType}
                      onValueChange={(v) => setQuotaForm({ ...quotaForm, quotaType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diaria</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">App destino</label>
                    <Select
                      value={quotaForm.targetAppId}
                      onValueChange={(v) => setQuotaForm({ ...quotaForm, targetAppId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="app180">app180</SelectItem>
                        <SelectItem value="construgest">construgest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Max llamadas ({quotaForm.quotaType === "daily" ? "por dia" : "por mes"})
                    </label>
                    <Input
                      type="number"
                      value={quotaForm.maxCalls}
                      onChange={(e) =>
                        setQuotaForm({ ...quotaForm, maxCalls: e.target.value })
                      }
                      placeholder="Sin limite"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Dejar vacio = sin limite individual (usa cuota de org)
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveUserQuota}>Guardar</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Consumo ── */}
      {tab === "consumption" && (
        <div className="space-y-4">
          {/* Period selector */}
          <div className="flex gap-2">
            {[
              { value: "day", label: "Hoy" },
              { value: "month", label: "Este mes" },
              { value: "all", label: "Todo" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setPeriod(p.value);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  period === p.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* By App */}
          <div className="grid sm:grid-cols-2 gap-4">
            {consumption?.totals?.map((t) => (
              <div key={t.app_id} className="bg-card border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={t.app_id === "app180" ? "default" : "secondary"}>
                    {t.app_id}
                  </Badge>
                  <span className="text-sm font-medium text-amber-600">
                    {formatCost(Number(t.total_cost))}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-purple-600">{Number(t.total_calls)}</p>
                    <p className="text-xs text-muted-foreground">Llamadas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      {formatTokens(Number(t.total_input_tokens))}
                    </p>
                    <p className="text-xs text-muted-foreground">Input</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">
                      {formatTokens(Number(t.total_output_tokens))}
                    </p>
                    <p className="text-xs text-muted-foreground">Output</p>
                  </div>
                </div>
              </div>
            ))}
            {(!consumption?.totals || consumption.totals.length === 0) && (
              <p className="text-muted-foreground text-sm col-span-2 text-center py-8">
                Sin datos de consumo para este periodo
              </p>
            )}
          </div>

          {/* By Provider */}
          {consumption?.byProvider && consumption.byProvider.length > 0 && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Por Proveedor</h3>
              <div className="space-y-2">
                {consumption.byProvider.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {p.app_id}
                      </Badge>
                      <span className="font-medium capitalize">{p.provider}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-purple-600">{p.calls} calls</span>
                      <span className="text-blue-600">
                        {formatTokens(p.input_tokens + p.output_tokens)} tok
                      </span>
                      <span className="text-amber-600 font-medium">{formatCost(p.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Trend */}
          {trend.length > 0 && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Ultimos 30 dias</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">App</th>
                      <th className="text-right p-2">Llamadas</th>
                      <th className="text-right p-2">Tokens</th>
                      <th className="text-right p-2">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {trend.slice(0, 30).map((t, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-2">{t.date}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {t.app_id}
                          </Badge>
                        </td>
                        <td className="p-2 text-right text-purple-600">{t.calls}</td>
                        <td className="p-2 text-right text-blue-600">
                          {formatTokens(t.input_tokens + t.output_tokens)}
                        </td>
                        <td className="p-2 text-right text-amber-600">{formatCost(t.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Creditos ── */}
      {tab === "credits" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {credits.map((c) => {
              const pct =
                c.initial_amount > 0
                  ? Math.max(0, Math.round((c.remaining / c.initial_amount) * 100))
                  : 0;
              const isLow = pct < 20;
              return (
                <div key={c.provider} className="bg-card border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium capitalize">{c.provider}</h3>
                    <Badge variant={c.credit_type === "credit" ? "default" : "secondary"}>
                      {c.credit_type}
                    </Badge>
                  </div>

                  <div className="text-center py-2">
                    <p
                      className={`text-3xl font-bold ${
                        isLow ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCost(c.remaining)}
                    </p>
                    <p className="text-xs text-muted-foreground">restante</p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isLow ? "bg-red-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Inicial: {formatCost(c.initial_amount)}</span>
                    <span>Usado: {formatCost(c.consumed)}</span>
                  </div>

                  {editingCredit === c.provider ? (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Input
                        type="number"
                        step="0.01"
                        value={creditEditValue}
                        onChange={(e) => setCreditEditValue(e.target.value)}
                        className="w-24 h-8 text-sm"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => saveCredit(c.provider)}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCredit(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingCredit(c.provider);
                        setCreditEditValue(String(c.initial_amount));
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700 pt-2 border-t w-full text-left"
                    >
                      {c.credit_type === "credit" ? "Actualizar credito" : "Resetear tras pago"}
                    </button>
                  )}
                </div>
              );
            })}
            {credits.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-3 text-center py-8">
                No hay creditos de proveedores configurados
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
