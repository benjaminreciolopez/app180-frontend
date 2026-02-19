
import { X, ClipboardList, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TrabajosModalProps {
    isOpen: boolean;
    onClose: () => void;
    trabajos: { id: string; descripcion: string; fecha: string; cliente_nombre: string | null; estado_detalle: string }[];
}

export function TrabajosPendientesModal({ isOpen, onClose, trabajos }: TrabajosModalProps) {
    function fecha(d: string) {
        return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Trabajos Pendientes de Facturar
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    {!trabajos || trabajos.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No hay trabajos pendientes.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Fecha</th>
                                        <th className="px-4 py-3 font-medium">Cliente</th>
                                        <th className="px-4 py-3 font-medium">Descripción</th>
                                        <th className="px-4 py-3 font-medium">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {trabajos.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-500">{fecha(t.fecha)}</td>
                                            <td className="px-4 py-3 font-medium">{t.cliente_nombre || "Sin cliente"}</td>
                                            <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={t.descripcion}>{t.descripcion}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                    PENDIENTE
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
