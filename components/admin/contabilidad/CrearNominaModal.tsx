"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authenticatedFetch } from "@/utils/api";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    prefilledData?: any; // Datos del OCR
    pdfFile?: File | null;
}

export default function CrearNominaModal({ isOpen, onClose, onSuccess, prefilledData, pdfFile }: Props) {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        empleado_id: "",
        anio: new Date().getFullYear().toString(),
        mes: (new Date().getMonth() + 1).toString(),
        bruto: "",
        seguridad_social_empresa: "",
        irpf_retencion: "",
        liquido: "",
    });

    useEffect(() => {
        // Cargar empleados para el select
        const loadEmployees = async () => {
            try {
                const res = await authenticatedFetch("/api/empleados");
                if (res.ok) {
                    const json = await res.json();
                    setEmployees(json);
                }
            } catch (error) {
                console.error("Error loading employees", error);
            }
        };
        if (isOpen) loadEmployees();
    }, [isOpen]);

    useEffect(() => {
        if (prefilledData) {
            setFormData(prev => ({
                ...prev,
                anio: prefilledData.anio?.toString() || prev.anio,
                mes: prefilledData.mes?.toString() || prev.mes,
                bruto: prefilledData.bruto?.toString() || "",
                seguridad_social_empresa: prefilledData.seguridad_social_empresa?.toString() || "",
                irpf_retencion: prefilledData.irpf_retencion?.toString() || "",
                liquido: prefilledData.liquido?.toString() || "",
            }));
        }
    }, [prefilledData]);

    const calculateCosteTotal = () => {
        const bruto = parseFloat(formData.bruto) || 0;
        const ss = parseFloat(formData.seguridad_social_empresa) || 0;
        return bruto + ss;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formDataPayload = new FormData();

            // Append fields
            Object.entries(formData).forEach(([key, value]) => {
                formDataPayload.append(key, value);
            });

            // Append PDF if exists (from OCR step or new input)
            if (pdfFile) {
                formDataPayload.append("file", pdfFile);
            }

            // Headers: let browser set Content-Type for FormData
            const res = await authenticatedFetch("/api/nominas", {
                method: "POST",
                body: formDataPayload
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const json = await res.json();
                alert("Error al guardar: " + json.error);
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{prefilledData ? "Revisar Nómina Importada" : "Nueva Nómina Manual"}</DialogTitle>
                    <DialogDescription>
                        {prefilledData
                            ? "Los datos han sido extraídos del PDF. Por favor, revisa y asigna el empleado."
                            : "Introduce los datos de la nómina manualmente."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Año</Label>
                            <Input
                                type="number"
                                value={formData.anio}
                                onChange={e => setFormData({ ...formData, anio: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mes</Label>
                            <Select
                                value={formData.mes}
                                onValueChange={v => setFormData({ ...formData, mes: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <SelectItem key={m} value={m.toString()}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Empleado</Label>
                        <Select
                            value={formData.empleado_id}
                            onValueChange={v => setFormData({ ...formData, empleado_id: v })}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar empleado..." />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.nombre} {emp.apellidos}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Salario Bruto</Label>
                            <Input
                                type="number" step="0.01"
                                value={formData.bruto}
                                onChange={e => setFormData({ ...formData, bruto: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>S.S. a cargo Empresa</Label>
                            <Input
                                type="number" step="0.01"
                                value={formData.seguridad_social_empresa}
                                onChange={e => setFormData({ ...formData, seguridad_social_empresa: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Retención IRPF</Label>
                            <Input
                                type="number" step="0.01"
                                value={formData.irpf_retencion}
                                onChange={e => setFormData({ ...formData, irpf_retencion: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Líquido a Percibir</Label>
                            <Input
                                type="number" step="0.01"
                                value={formData.liquido}
                                onChange={e => setFormData({ ...formData, liquido: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-muted p-3 rounded-md flex justify-between items-center font-medium">
                        <span>Coste Total Empresa:</span>
                        <span className="text-lg">{formatCurrency(calculateCosteTotal())}</span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
                            Guardar Nómina
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
