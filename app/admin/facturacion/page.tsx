"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowUpRight, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { UniversalExportButton } from "@/components/shared/UniversalExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Helpers
async function api(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error API");
  }
  return res.json();
}

type TrabajoPendiente = {
    id: string;
    fecha: string;
    descripcion: string;
    valor: number;
    pagado: number;
    estado_pago: string;
};

export default function FacturacionPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [clientsData, setClientsData] = useState<any[]>([]);

  // Drawer & New Payment state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string, nombre: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendientes, setPendientes] = useState<TrabajoPendiente[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Record<string, number>>({}); 

  const [newPay, setNewPay] = useState({
    importe: "",
    metodo: "transferencia",
    fecha_pago: new Date().toISOString().slice(0, 10),
    referencia: "",
    notas: ""
  });

  async function load() {
    try {
      setLoading(true);
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;

      const data = await api(`/admin/billing/clients?desde=${from}&hasta=${to}`);
      setClientsData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [year]);

  useEffect(() => {
    if (drawerOpen && selectedClient) {
        loadPendientes(selectedClient.id);
        setSelectedJobs({});
    }
  }, [drawerOpen, selectedClient]);

  async function loadPendientes(clientId: string) {
    setLoadingPendientes(true);
    try {
        const data = await api(`/admin/clientes/${clientId}/trabajos-pendientes`);
        setPendientes(data);
    } catch(e) {
        toast.error("Error cargando trabajos pendientes");
    } finally {
        setLoadingPendientes(false);
    }
}

function autoDistribute() {
    const totalAmount = Number(newPay.importe);
    if(!totalAmount) return;

    let remaining = totalAmount;
    const newSelection: Record<string, number> = {};

    for(const job of pendientes) {
        if(remaining <= 0.01) break;
        
        const debt = Number(job.valor) - Number(job.pagado || 0);
        const pay = Math.min(remaining, debt);
        
        if (pay > 0) {
            newSelection[job.id] = Number(pay.toFixed(2));
            remaining -= pay;
        }
    }
    setSelectedJobs(newSelection);
}

const currentAllocated = Object.values(selectedJobs).reduce((a,b) => a+b, 0);

async function createPayment() {
    if(!selectedClient) return;
    if(!newPay.importe) return toast.error("Indica importe");
    if(submitting) return;
    
    const asignaciones = Object.entries(selectedJobs).map(([work_log_id, importe]) => ({
        work_log_id,
        importe
    })).filter(x => x.importe > 0);

    const totalAllocated = asignaciones.reduce((a,b) => a + b.importe, 0);
    if(totalAllocated > Number(newPay.importe) + 0.05) { 
        return toast.error(`Has asignado más (${formatCurrency(totalAllocated)}) del importe del pago (${formatCurrency(Number(newPay.importe))})`);
    }

    setSubmitting(true);
    try {
        await api(`/admin/pagos`, {
            method: "POST",
            body: JSON.stringify({
                cliente_id: selectedClient.id,
                importe: Number(newPay.importe),
                metodo: newPay.metodo,
                fecha_pago: newPay.fecha_pago,
                referencia: newPay.referencia,
                notas: newPay.notas,
                asignaciones
            })
        });
        toast.success("Pago registrado correctamente");
        setDrawerOpen(false);
        load(); // Reload main dashboard stats
        setNewPay({ 
            importe: "", 
            metodo: "transferencia", 
            fecha_pago: new Date().toISOString().slice(0, 10), 
            referencia: "", 
            notas: "" 
        });
    } catch(e: any) {
        toast.error(e.message);
    } finally {
        setSubmitting(false);
    }
}

  // Aggregates
  const totalTrabajo = clientsData.reduce((acc, c) => acc + Number(c.total_valor || 0), 0);
  const totalPagado = clientsData.reduce((acc, c) => acc + Number(c.total_pagado || 0), 0);
  const totalDeuda = clientsData.reduce((acc, c) => acc + Number(c.saldo || 0), 0);

  return (
    <div className="p-6 space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Control de Cobros {year}</h1>
        <div className="flex gap-2">
            <UniversalExportButton 
                module="cobros"
                queryParams={{ 
                    desde: `${year}-01-01`,
                    hasta: `${year}-12-31`
                }}
                label="Exportar"
            />
            <Button variant="outline" size="sm" onClick={async () => {
                try {
                    setLoading(true);
                    const data = await api(`/empleado/fix-values`);
                    toast.success(`Valores recalculados: ${data.fixed} trabajos actualizados`);
                    load();
                } catch(e) {
                    toast.error("Error recalculando");
                } finally {
                    setLoading(false);
                }
            }}>
                Recalcular Valores
            </Button>
            <select 
                value={year} 
                onChange={e => setYear(Number(e.target.value))}
                className="border rounded p-2 text-sm bg-white"
            >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
      </div>

       {/* Resumen Global */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trabajo Valorado Global</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalTrabajo)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPagado)}</div>
            </CardContent>
        </Card>
        <Card className={totalDeuda > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deuda Total Clientes</CardTitle>
                <span className="text-muted-foreground font-bold">€</span>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${totalDeuda > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatCurrency(totalDeuda)}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Tabla Clientes */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-right">Trabajo (Est.)</th>
                        <th className="px-4 py-3 text-right">Pagado</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {clientsData.map(c => {
                        const saldo = Number(c.saldo);
                        const isDebt = saldo > 0.01;
                        return (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">
                                    <div className="flex flex-col">
                                        <span>{c.nombre}</span>
                                        {c.codigo && <span className="text-xs text-gray-400">{c.codigo}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(c.total_valor)}</td>
                                <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(c.total_pagado)}</td>
                                <td className={`px-4 py-3 text-right font-bold ${isDebt ? 'text-red-600' : 'text-gray-400'}`}>
                                    {formatCurrency(saldo)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                            onClick={() => {
                                                setSelectedClient({ id: c.id, nombre: c.nombre });
                                                setDrawerOpen(true);
                                            }}
                                        >
                                            <Plus className="w-4 h-4" /> Pago
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8"
                                            onClick={() => router.push(`/admin/clientes/${c.id}/pagos`)}
                                        >
                                            Historial
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                     {!loading && clientsData.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-500">No hay datos en este periodo</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </Card>
      {/* Drawer Registrar Pago */}
      <AnimatePresence>
        {drawerOpen && selectedClient && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          >
            <motion.div
              className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                    <h2 className="text-xl font-bold">Registrar Pago</h2>
                    <p className="text-sm text-gray-500">{selectedClient.nombre}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
                  <X size={20} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 
                 {/* Datos Generales */}
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-sm font-medium">Importe (€)</label>
                        <Input 
                            type="number" 
                            className="text-lg font-bold"
                            value={newPay.importe} 
                            onChange={e => setNewPay({...newPay, importe: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="text-sm font-medium">Fecha Pago</label>
                        <Input 
                            type="date" 
                            value={newPay.fecha_pago} 
                            onChange={e => setNewPay({...newPay, fecha_pago: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="text-sm font-medium">Método</label>
                        <select 
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={newPay.metodo}
                            onChange={e => setNewPay({...newPay, metodo: e.target.value})}
                        >
                            <option value="transferencia">Transferencia</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="bizum">Bizum</option>
                            <option value="otro">Otro</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-sm font-medium">Referencia</label>
                        <Input 
                            placeholder="Ej. Factura 123"
                            value={newPay.referencia} 
                            onChange={e => setNewPay({...newPay, referencia: e.target.value})}
                        />
                     </div>
                 </div>

                 {/* Selector de Trabajos */}
                 <div className="border rounded-lg p-4 bg-gray-50">
                     <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
                         <h3 className="font-semibold text-gray-700">Imputar a Trabajos Pendientes</h3>
                         <div className="text-xs text-gray-500">
                            Disponible: <span className="font-mono font-bold">{formatCurrency(Math.max(0, Number(newPay.importe) - currentAllocated))}</span>
                         </div>
                         <Button size="sm" variant="outline" onClick={autoDistribute}>
                            Auto-distribuir
                         </Button>
                     </div>

                     {loadingPendientes ? (
                         <div className="flex justify-center py-8">
                             <LoadingSpinner showText={false} />
                         </div>
                     ) : (
                         <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                             {pendientes.length === 0 && <p className="text-sm text-gray-400 text-center">No hay trabajos pendientes de pago.</p>}
                             
                             {pendientes.map(job => {
                                 const debt = Number(job.valor) - Number(job.pagado || 0);
                                 const isSelected = selectedJobs[job.id] !== undefined;
                                 
                                 return (
                                     <div key={job.id} className={`p-3 rounded border text-sm flex items-center gap-3 transition-colors ${isSelected ? "bg-blue-50 border-blue-200" : "bg-white"}`}>
                                         <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if(e.target.checked) {
                                                    const totalPay = Number(newPay.importe);
                                                    const alreadyAllocated = Object.values(selectedJobs).reduce((a,b) => a+b, 0);
                                                    const remainingCapacity = Math.max(0, totalPay - alreadyAllocated);
                                                    const amountToAssign = Math.min(debt, remainingCapacity);
                                                    setSelectedJobs(prev => ({ ...prev, [job.id]: Number(amountToAssign.toFixed(2)) }))
                                                } else {
                                                    const copy = {...selectedJobs};
                                                    delete copy[job.id];
                                                    setSelectedJobs(copy);
                                                }
                                            }}
                                            className="h-4 w-4"
                                         />
                                         <div className="flex-1">
                                             <div className="font-medium text-gray-800">{new Date(job.fecha).toLocaleDateString()} - {job.descripcion}</div>
                                             <div className="text-xs text-gray-500">
                                                 Valor: {formatCurrency(job.valor)} · Pagado: {formatCurrency(job.pagado || 0)} · <span className="text-red-600 font-bold">Pendiente: {formatCurrency(debt)}</span>
                                             </div>
                                         </div>
                                         {isSelected && (
                                             <div className="w-24">
                                                 <Input 
                                                    type="number" 
                                                    className="h-8 text-right bg-white px-2"
                                                    value={selectedJobs[job.id]}
                                                    onChange={e => {
                                                        const val = Number(e.target.value);
                                                        setSelectedJobs(prev => ({...prev, [job.id]: val}));
                                                    }}
                                                 />
                                             </div>
                                         )}
                                     </div>
                                 )
                             })}
                         </div>
                     )}
                 </div>

                 <div>
                    <label className="text-sm font-medium">Notas</label>
                    <Input 
                        placeholder="Notas internas..."
                        value={newPay.notas} 
                        onChange={e => setNewPay({...newPay, notas: e.target.value})}
                    />
                 </div>

              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-between gap-4 items-center">
                  <div className="text-sm text-gray-600">
                      Asignado: <span className="font-bold text-black">{formatCurrency(Object.values(selectedJobs).reduce((a,b)=>a+b, 0))}</span>
                  </div>
                  <Button onClick={createPayment} className="flex-1" disabled={submitting}>
                    {submitting ? "Registrando..." : "Registrar Pago"}
                  </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <LoadingSpinner fullPage />}
    </div>
  );
}
