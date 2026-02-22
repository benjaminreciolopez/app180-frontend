"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Upload,
    FileSpreadsheet,
    FileText,
    Loader2,
    AlertTriangle,
    Check,
    ArrowRight,
    ArrowLeft,
    Ban,
} from "lucide-react";

type Transaction = {
    idx: number;
    fecha: string;
    concepto: string;
    importe: number;
    total_abs: number;
    saldo: number | null;
    es_gasto: boolean;
    es_duplicado: boolean;
    duplicado_id: string | null;
    proveedor_sugerido?: string;
    categoria_sugerida?: string;
    // User-editable
    proveedor: string;
    selected: boolean;
};

type Resumen = {
    total_movimientos: number;
    total_gastos: number;
    total_ingresos: number;
    suma_gastos: number;
    periodo: string | null;
};

type Step = "upload" | "preview" | "confirm";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BankImportDialog({ open, onClose, onSuccess }: Props) {
    const [step, setStep] = useState<Step>("upload");
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [resumen, setResumen] = useState<Resumen | null>(null);
    const [bankName, setBankName] = useState("");
    const [fileName, setFileName] = useState("");
    const [showOnlyGastos, setShowOnlyGastos] = useState(true);
    const [importing, setImporting] = useState(false);

    // PDF password
    const [needsPassword, setNeedsPassword] = useState(false);
    const [pdfPassword, setPdfPassword] = useState("");
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    // Defaults for bulk import
    const [defaultCategoria, setDefaultCategoria] = useState("general");
    const [defaultMetodoPago, setDefaultMetodoPago] = useState("domiciliacion");
    const [defaultIvaPct, setDefaultIvaPct] = useState(0);

    const reset = () => {
        setStep("upload");
        setLoading(false);
        setTransactions([]);
        setNeedsPassword(false);
        setPdfPassword("");
        setPendingFile(null);
        setResumen(null);
        setBankName("");
        setFileName("");
        setShowOnlyGastos(true);
        setImporting(false);
        setDefaultCategoria("general");
        setDefaultMetodoPago("domiciliacion");
        setDefaultIvaPct(0);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    // ========== UPLOAD ==========
    const handleFileUpload = async (file: File, password?: string) => {
        setLoading(true);
        setFileName(file.name);
        try {
            const formData = new FormData();
            formData.append("file", file);
            if (password) formData.append("password", password);

            const res = await api.post("/api/admin/purchases/bank-import", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const data = res.data;

            if (data.document_type === "invoice" && data.redirect_ocr) {
                showError("Este documento parece ser una factura, no un extracto bancario. Usa 'Nuevo Gasto' para procesarla.");
                setLoading(false);
                return;
            }

            setNeedsPassword(false);
            setPdfPassword("");
            setPendingFile(null);

            const txs: Transaction[] = (data.transactions || []).map((t: any) => ({
                ...t,
                proveedor: t.proveedor_sugerido || "",
                selected: t.es_gasto && !t.es_duplicado,
            }));

            setTransactions(txs);
            setResumen(data.resumen);
            setBankName(data.bank_name || "");
            setStep("preview");
        } catch (err: any) {
            if (err?.response?.data?.code === "PDF_PASSWORD_REQUIRED") {
                setPendingFile(file);
                setNeedsPassword(true);
                setLoading(false);
                return;
            }
            showError(err?.response?.data?.error || "Error al procesar el archivo");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = () => {
        if (pendingFile && pdfPassword) {
            handleFileUpload(pendingFile, pdfPassword);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    // ========== SELECTION ==========
    const filteredTxs = useMemo(() => {
        return showOnlyGastos ? transactions.filter(t => t.es_gasto) : transactions;
    }, [transactions, showOnlyGastos]);

    const selectedCount = useMemo(() => transactions.filter(t => t.selected).length, [transactions]);
    const selectedTotal = useMemo(
        () => transactions.filter(t => t.selected).reduce((s, t) => s + t.total_abs, 0),
        [transactions]
    );

    const toggleSelect = (idx: number) => {
        setTransactions(prev =>
            prev.map(t => (t.idx === idx ? { ...t, selected: !t.selected } : t))
        );
    };

    const toggleSelectAll = (checked: boolean) => {
        setTransactions(prev =>
            prev.map(t => {
                if (showOnlyGastos && !t.es_gasto) return t;
                if (t.es_duplicado) return t;
                return { ...t, selected: checked };
            })
        );
    };

    const updateProveedor = (idx: number, value: string) => {
        setTransactions(prev =>
            prev.map(t => (t.idx === idx ? { ...t, proveedor: value } : t))
        );
    };

    // ========== CONFIRM ==========
    const handleConfirm = async () => {
        const selected = transactions.filter(t => t.selected);
        if (selected.length === 0) {
            showError("No hay transacciones seleccionadas");
            return;
        }

        setImporting(true);
        try {
            const ivaPct = defaultIvaPct;
            const txsToSend = selected.map(t => {
                const total = t.total_abs;
                const base = ivaPct > 0 ? Math.round((total / (1 + ivaPct / 100)) * 100) / 100 : total;
                const ivaImporte = Math.round((total - base) * 100) / 100;

                return {
                    fecha_compra: t.fecha,
                    descripcion: t.concepto,
                    proveedor: t.proveedor || null,
                    total,
                    base_imponible: base,
                    iva_porcentaje: ivaPct,
                    iva_importe: ivaImporte,
                    categoria: t.categoria_sugerida || defaultCategoria,
                    metodo_pago: defaultMetodoPago,
                    concepto_original: t.concepto,
                };
            });

            const res = await api.post("/api/admin/purchases/bank-import/confirm", {
                transactions: txsToSend,
                source_file_name: fileName,
            });

            const data = res.data;
            showSuccess(`${data.imported} gastos importados correctamente`);
            if (data.errors?.length > 0) {
                showError(`${data.errors.length} errores al importar`);
            }
            handleClose();
            onSuccess();
        } catch (err: any) {
            showError(err?.response?.data?.error || "Error al importar");
        } finally {
            setImporting(false);
        }
    };

    const allFilteredSelected = filteredTxs.filter(t => !t.es_duplicado).every(t => t.selected);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet size={20} />
                        Importar Extracto Bancario
                        {bankName && <Badge variant="outline" className="ml-2">{bankName}</Badge>}
                    </DialogTitle>
                </DialogHeader>

                {/* ========== STEP: UPLOAD ========== */}
                {step === "upload" && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-12 h-12 animate-spin text-slate-400" />
                                <p className="text-slate-500">Procesando extracto bancario...</p>
                                <p className="text-sm text-slate-400">Esto puede tardar unos segundos</p>
                            </div>
                        ) : needsPassword ? (
                            <div className="flex flex-col items-center gap-4 w-full max-w-md">
                                <AlertTriangle className="w-12 h-12 text-amber-500" />
                                <p className="text-lg font-medium text-slate-700">PDF protegido con contraseña</p>
                                <p className="text-sm text-slate-500 text-center">
                                    El archivo <strong>{fileName}</strong> requiere contraseña para abrirlo.
                                </p>
                                <Input
                                    type="password"
                                    placeholder="Contraseña del PDF..."
                                    value={pdfPassword}
                                    onChange={(e) => setPdfPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                                    className="rounded-xl h-11"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => { setNeedsPassword(false); setPendingFile(null); }} className="rounded-xl">
                                        Cancelar
                                    </Button>
                                    <Button onClick={handlePasswordSubmit} disabled={!pdfPassword} className="bg-black text-white hover:bg-slate-800 rounded-xl">
                                        Desbloquear
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-slate-400 transition-colors cursor-pointer w-full max-w-lg"
                                onClick={() => document.getElementById("bank-file-input")?.click()}
                            >
                                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                                <p className="text-lg font-medium text-slate-700 mb-2">
                                    Arrastra tu extracto bancario aqui
                                </p>
                                <p className="text-sm text-slate-500 mb-4">
                                    Soporta CSV y PDF de BBVA, Santander, CaixaBank y otros
                                </p>
                                <Button variant="outline" className="rounded-xl">
                                    Seleccionar archivo
                                </Button>
                                <input
                                    id="bank-file-input"
                                    type="file"
                                    accept=".csv,.pdf"
                                    className="hidden"
                                    onChange={handleFileInput}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ========== STEP: PREVIEW ========== */}
                {step === "preview" && (
                    <div className="flex-1 flex flex-col overflow-hidden gap-4">
                        {/* Summary bar */}
                        {resumen && (
                            <div className="flex flex-wrap gap-3 items-center text-sm">
                                <Badge variant="outline">{resumen.total_movimientos} movimientos</Badge>
                                <Badge className="bg-red-50 text-red-700 border-red-200">{resumen.total_gastos} gastos</Badge>
                                <Badge className="bg-green-50 text-green-700 border-green-200">{resumen.total_ingresos} ingresos</Badge>
                                {resumen.periodo && (
                                    <span className="text-slate-500">Periodo: {resumen.periodo}</span>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                    <Checkbox
                                        checked={showOnlyGastos}
                                        onCheckedChange={(v) => setShowOnlyGastos(!!v)}
                                    />
                                    <span className="text-slate-600 text-sm">Solo gastos</span>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="flex-1 overflow-auto border rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 w-10">
                                            <Checkbox
                                                checked={allFilteredSelected}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="p-3 text-left font-medium text-slate-600">Fecha</th>
                                        <th className="p-3 text-left font-medium text-slate-600">Concepto</th>
                                        <th className="p-3 text-left font-medium text-slate-600">Proveedor</th>
                                        <th className="p-3 text-right font-medium text-slate-600">Importe</th>
                                        <th className="p-3 text-center font-medium text-slate-600">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTxs.map((tx) => (
                                        <tr
                                            key={tx.idx}
                                            className={`border-t hover:bg-slate-50 transition-colors ${tx.es_duplicado ? "bg-amber-50/50 opacity-60" : ""
                                                }`}
                                        >
                                            <td className="p-3">
                                                <Checkbox
                                                    checked={tx.selected}
                                                    onCheckedChange={() => toggleSelect(tx.idx)}
                                                    disabled={tx.es_duplicado}
                                                />
                                            </td>
                                            <td className="p-3 whitespace-nowrap text-slate-700">
                                                {(() => {
                                                    try {
                                                        return format(new Date(tx.fecha), "dd/MM/yyyy");
                                                    } catch { return tx.fecha; }
                                                })()}
                                            </td>
                                            <td className="p-3 text-slate-700 max-w-xs truncate" title={tx.concepto}>
                                                {tx.concepto}
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    value={tx.proveedor}
                                                    onChange={(e) => updateProveedor(tx.idx, e.target.value)}
                                                    placeholder="Proveedor..."
                                                    className="h-8 text-sm rounded-lg border-slate-200"
                                                />
                                            </td>
                                            <td className={`p-3 text-right font-medium whitespace-nowrap ${tx.es_gasto ? "text-red-600" : "text-green-600"}`}>
                                                {tx.es_gasto ? "-" : "+"}{formatCurrency(tx.total_abs)}
                                            </td>
                                            <td className="p-3 text-center">
                                                {tx.es_duplicado ? (
                                                    <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs gap-1">
                                                        <AlertTriangle size={12} /> Duplicado
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs gap-1">
                                                        <Check size={12} /> Nuevo
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm text-slate-600">
                                {selectedCount} seleccionados — Total: <strong>{formatCurrency(selectedTotal)}</strong>
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleClose} className="rounded-xl">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={() => setStep("confirm")}
                                    disabled={selectedCount === 0}
                                    className="bg-black text-white hover:bg-slate-800 rounded-xl gap-2"
                                >
                                    Siguiente <ArrowRight size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========== STEP: CONFIRM ========== */}
                {step === "confirm" && (
                    <div className="flex-1 flex flex-col gap-6 p-4">
                        <div className="bg-slate-50 p-6 rounded-xl text-center">
                            <p className="text-2xl font-bold text-slate-800">{selectedCount} gastos</p>
                            <p className="text-lg text-slate-600">por un total de <strong>{formatCurrency(selectedTotal)}</strong></p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Categoria por defecto</label>
                                <Select value={defaultCategoria} onValueChange={setDefaultCategoria}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General</SelectItem>
                                        <SelectItem value="suministros">Suministros</SelectItem>
                                        <SelectItem value="alquiler">Alquiler</SelectItem>
                                        <SelectItem value="telefonia">Telefonia</SelectItem>
                                        <SelectItem value="seguros">Seguros</SelectItem>
                                        <SelectItem value="material">Material</SelectItem>
                                        <SelectItem value="transporte">Transporte</SelectItem>
                                        <SelectItem value="formacion">Formacion</SelectItem>
                                        <SelectItem value="publicidad">Publicidad</SelectItem>
                                        <SelectItem value="software">Software</SelectItem>
                                        <SelectItem value="comisiones_bancarias">Comisiones bancarias</SelectItem>
                                        <SelectItem value="impuestos">Impuestos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">Metodo de pago</label>
                                <Select value={defaultMetodoPago} onValueChange={setDefaultMetodoPago}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="domiciliacion">Domiciliacion</SelectItem>
                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-600 mb-1 block">IVA por defecto (%)</label>
                                <Select value={String(defaultIvaPct)} onValueChange={(v) => setDefaultIvaPct(Number(v))}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">0% (sin IVA)</SelectItem>
                                        <SelectItem value="4">4%</SelectItem>
                                        <SelectItem value="10">10%</SelectItem>
                                        <SelectItem value="21">21%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500">
                            La base imponible se calculara automaticamente a partir del total y el porcentaje de IVA.
                            Si el IVA es 0%, la base imponible sera igual al total.
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t">
                            <Button variant="outline" onClick={() => setStep("preview")} className="rounded-xl gap-2">
                                <ArrowLeft size={16} /> Volver
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={importing}
                                className="bg-black text-white hover:bg-slate-800 rounded-xl gap-2 px-8"
                            >
                                {importing ? (
                                    <><Loader2 size={16} className="animate-spin" /> Importando...</>
                                ) : (
                                    <><Check size={16} /> Importar {selectedCount} gastos</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
