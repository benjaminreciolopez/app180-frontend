"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    plantilla: any;
}

export default function DialogEjecutarRecurrente({ isOpen, onClose, onSuccess, plantilla }: Props) {
    const [loading, setLoading] = useState(false);
    const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);

    if (!plantilla) return null;

    const handleEjecutar = async () => {
        if (!fecha) {
            showError("Selecciona una fecha de ejecución");
            return;
        }

        setLoading(true);
        try {
            await api.post(`/api/admin/gastos-recurrentes/${plantilla.id}/ejecutar`, { fecha });
            showSuccess(`Gasto "${plantilla.nombre}" ejecutado para el ${fecha}`);
            onSuccess();
            onClose();
        } catch (error: any) {
            showError(error?.response?.data?.error || "Error al ejecutar el gasto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ejecutar gasto recurrente</DialogTitle>
                    <DialogDescription>
                        Se creará un gasto real en el sistema con asiento contable.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Resumen */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Nombre</span>
                            <span className="text-sm font-medium">{plantilla.nombre}</span>
                        </div>
                        {plantilla.proveedor && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Proveedor</span>
                                <span className="text-sm">{plantilla.proveedor}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total</span>
                            <span className="text-sm font-semibold">{formatCurrency(plantilla.total)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Categoría</span>
                            <span className="text-sm">{plantilla.categoria}</span>
                        </div>
                    </div>

                    {/* Fecha */}
                    <div>
                        <Label className="mb-1">Fecha de ejecución</Label>
                        <Input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleEjecutar} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play className="mr-2" size={16} />}
                        Ejecutar gasto
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
