"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Utils
function fmt(num: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(num);
}

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

export default function PagosPage() {
  const { id } = useParams(); // Client ID
  const router = useRouter();

  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // New Payment Form
  const [newPay, setNewPay] = useState({
    importe: "",
    metodo: "transferencia",
    fecha_pago: "",
    referencia: "",
    notas: ""
  });

  async function load() {
    try {
        setLoading(true);
        const data = await api(`/admin/clientes/${id}/pagos`); // We assume this exists or create it
        // Wait, current route in `adminClientesRoutes.js`?
        // Let's check: Yes, `listarPagosCliente` exists (GET /clientes/:clienteId/pagos IS NOT in routes yet, wait checking...)
        // Actually `paymentsController.js` has `listarPagosCliente`.
        // I need to ensure the ROUTE exists or I add it.
        // Assuming route `GET /admin/clientes/:id/pagos` exists? 
        // No, current routes file had `router.get("/clientes/:id/tarifas", ...)` but I removed the billing/payments logic?
        // Wait, I need to check `adminClientesRoutes.js` content from previous reads.
        // It has `listarTarifasCliente`. Does it have `listarPagosCliente`? 
        // I will assume it DOES NOT and will add it in next tool calls if needed.
        // For now I write the frontend assuming the route will be `/admin/clientes/${id}/pagos`.
        
        // Wait, actually I better verify the route first or assume I'll add it.
        // I'll proceed creating the file and will fix backend routes in next steps.
        
        setPagos(data);
    } catch(e) {
        console.error(e);
        // If route doesn't exist yet, it fails silentish 
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    if(id) load();
    setNewPay(p => ({ ...p, fecha_pago: new Date().toISOString().slice(0, 10) }));
  }, [id]);

  async function createPayment() {
    if(!newPay.importe) return alert("Indica importe");
    try {
        await api(`/admin/pagos`, {
            method: "POST",
            body: JSON.stringify({
                cliente_id: id,
                importe: Number(newPay.importe),
                metodo: newPay.metodo,
                fecha_pago: newPay.fecha_pago,
                referencia: newPay.referencia,
                notas: newPay.notas
            })
        });
        toast.success("Pago registrado");
        setDrawerOpen(false);
        load();
        setNewPay({ importe: "", metodo: "transferencia", fecha_pago: new Date().toISOString().slice(0, 10), referencia: "", notas: "" });
    } catch(e: any) {
        toast.error(e.message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/clientes/${id}`)}
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-semibold flex-1">Gestión de Pagos</h1>
        <Button onClick={() => setDrawerOpen(true)} className="gap-2">
            <Plus size={16} /> Nuevo Pago
        </Button>
      </div>

        {/* List */}
        <div className="space-y-3">
            {pagos.map(p => (
                <Card key={p.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-lg">{fmt(p.importe)}</div>
                            <div className="text-sm text-gray-500">
                                {new Date(p.fecha_pago).toLocaleDateString()} · <span className="capitalize">{p.metodo}</span>
                            </div>
                            {p.notas && <div className="text-xs text-gray-400 mt-1">{p.notas}</div>}
                        </div>
                        <div className="text-right">
                             <div className={`text-xs px-2 py-1 rounded capitalize ${p.estado === 'registrado' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                {p.estado}
                             </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            {!loading && pagos.length === 0 && <div className="text-center py-10 text-gray-400">No hay pagos registrados</div>}
        </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          >
            <motion.div
              className="bg-white w-full max-w-md h-full p-6"
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Registrar Pago</h2>
                <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
                  <X size={18} />
                </Button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-sm font-medium">Importe (€)</label>
                    <Input 
                        type="number" 
                        value={newPay.importe} 
                        onChange={e => setNewPay({...newPay, importe: e.target.value})}
                    />
                 </div>
                 
                 <div>
                    <label className="text-sm font-medium">Método</label>
                    <select 
                        className="w-full border rounded px-3 py-2"
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
                    <label className="text-sm font-medium">Fecha Pago</label>
                    <Input 
                        type="date" 
                        value={newPay.fecha_pago} 
                        onChange={e => setNewPay({...newPay, fecha_pago: e.target.value})}
                    />
                 </div>

                 <div>
                    <label className="text-sm font-medium">Referencia / Notas</label>
                    <Input 
                        placeholder="Ej. Factura 123"
                        value={newPay.referencia} 
                        onChange={e => setNewPay({...newPay, referencia: e.target.value})}
                    />
                    <Input 
                        className="mt-2"
                        placeholder="Notas internas..."
                        value={newPay.notas} 
                        onChange={e => setNewPay({...newPay, notas: e.target.value})}
                    />
                 </div>

                 <Button className="w-full mt-4" onClick={createPayment}>
                    Guardar Pago
                 </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
