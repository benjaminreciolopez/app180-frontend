"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Banknote, Plus, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface FacturaPendiente {
  id: number;
  numero: string;
  fecha: string;
  total: number | string;
  pagado: number | string;
  saldo: number | string;
  cliente_id: string;
  cliente_nombre: string;
}

interface PagoReciente {
  id: string;
  fecha_pago: string;
  importe: number | string;
  metodo: string;
  referencia: string | null;
  notas: string | null;
  cliente_nombre: string;
}

interface Resumen {
  total_pendiente_cobro: number;
  cobrado_mes: number;
  num_facturas_pendientes: number;
}

const METODOS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "bizum", label: "Bizum" },
  { value: "otro", label: "Otro" },
];

const fmt = (n: number | string) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export default function AsesorClienteCobrosPagosPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState<FacturaPendiente[]>([]);
  const [pagos, setPagos] = useState<PagoReciente[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [registroForm, setRegistroForm] = useState({
    cliente_id: "",
    factura_id: "",
    importe: "",
    metodo: "transferencia",
    fecha_pago: new Date().toISOString().slice(0, 10),
    referencia: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [empresaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/asesor/clientes/${empresaId}/cobros-pagos`);
      const d = res.data?.data;
      if (d) {
        setFacturas(d.facturas_pendientes || []);
        setPagos(d.pagos_recientes || []);
        setResumen(d.resumen || null);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Error cargando cobros y pagos");
    } finally {
      setLoading(false);
    }
  }

  function abrirRegistrar(factura?: FacturaPendiente) {
    setRegistroForm({
      cliente_id: factura?.cliente_id || "",
      factura_id: factura ? String(factura.id) : "",
      importe: factura ? String(factura.saldo) : "",
      metodo: "transferencia",
      fecha_pago: new Date().toISOString().slice(0, 10),
      referencia: "",
      notas: factura ? `Cobro factura ${factura.numero}` : "",
    });
    setRegistrarOpen(true);
  }

  async function handleRegistrar() {
    if (!registroForm.cliente_id) {
      showError("Cliente obligatorio (selecciona una factura)");
      return;
    }
    const importe = parseFloat(registroForm.importe);
    if (!(importe > 0)) {
      showError("Importe inválido");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/asesor/clientes/${empresaId}/cobros-pagos/registrar`, {
        cliente_id: registroForm.cliente_id,
        factura_id: registroForm.factura_id || undefined,
        importe,
        metodo: registroForm.metodo,
        fecha_pago: registroForm.fecha_pago,
        referencia: registroForm.referencia || null,
        notas: registroForm.notas || null,
      });
      showSuccess("Cobro registrado");
      setRegistrarOpen(false);
      await load();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error registrando cobro");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6" />
            Cobros y pagos
          </h1>
          <p className="text-sm text-muted-foreground">
            Facturas pendientes de cobro y pagos registrados del cliente.
          </p>
        </div>
        <Button onClick={() => abrirRegistrar()} className="gap-2">
          <Plus className="w-4 h-4" />
          Registrar cobro
        </Button>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Pendiente de cobro</p>
              <p className="text-xl font-bold mt-1 text-amber-700">{fmt(resumen.total_pendiente_cobro)}</p>
              <p className="text-xs text-muted-foreground mt-1">{resumen.num_facturas_pendientes} facturas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Cobrado este mes</p>
              <p className="text-xl font-bold mt-1 text-emerald-700">{fmt(resumen.cobrado_mes)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Pagos recientes</p>
              <p className="text-xl font-bold mt-1">{pagos.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Facturas pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {facturas.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">No hay facturas pendientes de cobro 🎉</p>
          ) : (
            <div className="space-y-2">
              {facturas.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{f.numero}</span>
                      <Badge variant="outline" className="text-[10px]">{f.cliente_nombre}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(f.fecha).toLocaleDateString("es-ES")} · Total {fmt(f.total)} · Pagado {fmt(f.pagado)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-amber-700">{fmt(f.saldo)}</p>
                    <Button size="sm" variant="outline" onClick={() => abrirRegistrar(f)} className="mt-1">
                      Cobrar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Pagos recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">Sin pagos registrados.</p>
          ) : (
            <div className="space-y-1">
              {pagos.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.cliente_nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.fecha_pago).toLocaleDateString("es-ES")} · {p.metodo}
                      {p.referencia && ` · ${p.referencia}`}
                    </p>
                  </div>
                  <p className="font-semibold text-emerald-700 shrink-0">{fmt(p.importe)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={registrarOpen} onOpenChange={setRegistrarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {registroForm.factura_id && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                Asociar a factura: <strong>{facturas.find((f) => String(f.id) === registroForm.factura_id)?.numero}</strong>
              </div>
            )}
            {!registroForm.cliente_id && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                <select
                  value={registroForm.cliente_id}
                  onChange={(e) => setRegistroForm({ ...registroForm, cliente_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">— selecciona —</option>
                  {Array.from(new Map(facturas.map((f) => [f.cliente_id, f.cliente_nombre])).entries()).map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Importe *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={registroForm.importe}
                  onChange={(e) => setRegistroForm({ ...registroForm, importe: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Método</label>
                <select
                  value={registroForm.metodo}
                  onChange={(e) => setRegistroForm({ ...registroForm, metodo: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {METODOS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha de pago</label>
              <Input
                type="date"
                value={registroForm.fecha_pago}
                onChange={(e) => setRegistroForm({ ...registroForm, fecha_pago: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Referencia</label>
              <Input
                value={registroForm.referencia}
                onChange={(e) => setRegistroForm({ ...registroForm, referencia: e.target.value })}
                placeholder="Nº transferencia, recibo…"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notas</label>
              <Input
                value={registroForm.notas}
                onChange={(e) => setRegistroForm({ ...registroForm, notas: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrarOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleRegistrar} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
