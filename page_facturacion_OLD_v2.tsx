"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  FileText,
  ShieldCheck,
  Save,
  Upload,
  Trash2,
  AlertCircle,
  Globe,
  Phone,
  Sparkles,
  Hash,
  Plus,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"


const LEGAL_IVA_TEXTS: Record<number, string> = {
  0: "FACTURA EXENTA DE IVA POR INVERSI├ôN DEL SUJETO PASIVO (ART. 84 UNO 2┬║ F LEY IVA 37/1992).",
  10: "IVA reducido seg├║n normativa vigente",
  4: "IVA superreducido seg├║n normativa vigente",
  21: ""
}

export default function ConfiguracionFacturacionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("empresa")

  useEffect(() => {
    // Restaurar pesta├▒a activa
    const savedTab = localStorage.getItem("facturacion_config_tab")
    if (savedTab) setActiveTab(savedTab)
  }, [])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    localStorage.setItem("facturacion_config_tab", val)
  }

  // Estado combinado para datos de emisor y sistema
  const [formData, setFormData] = useState<any>({
    // Emisor
    nif: "",
    nombre: "", // Razon Social
    nombre_comercial: "",
    direccion: "",
    cp: "",
    poblacion: "",
    provincia: "",
    pais: "Espa├▒a",
    email: "",
    web: "",
    telefono: "",
    registro_mercantil: "",
    iban: "",

    // Configuraci├│n Factura
    terminos_legales: "",
    texto_pie: "",
    texto_exento: "",
    texto_rectificativa: "",

    // Configuraci├│n Sistema
    verifactu_activo: false,
    verifactu_modo: "TEST",
    numeracion_tipo: "STANDARD", // 'STANDARD', 'BY_YEAR', 'PREFIXED'
    numeracion_formato: "FAC-{YEAR}-",
    numeracion_locked: false,

    storage_facturas_folder: "Facturas emitidas",

    logo_path: "",
    certificado_path: "",
    certificado_upload_date: "",
    certificado_info: null,

    // Migraci├│n
    correlativo_inicial: 0,
    migracion_last_serie: "",
    migracion_last_emisor_nif: "",
    migracion_last_cliente_nif: "",
    migracion_last_subtotal: 0,
    migracion_last_iva: 0,
    migracion_last_total: 0,
    migracion_last_pdf: "",
    migracion_legal_aceptado: false,
    migracion_fecha_aceptacion: null
  })

  // Factores de confianza del OCR para bloqueos din├ímicos
  const [ocrConfidence, setOcrConfidence] = useState<any>({
    numeracion: 0,
    identidad: 0,
    economicos: 0
  })

  const [passModalOpen, setPassModalOpen] = useState(false)
  const [certPassword, setCertPassword] = useState("")
  const [pendingCert, setPendingCert] = useState<any>(null)
  const [generatingAiField, setGeneratingAiField] = useState<string | null>(null)

  // REFS para subida de archivos
  const logoInputRef = useRef<HTMLInputElement>(null)
  const certInputRef = useRef<HTMLInputElement>(null)
  const migracionInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await api.get("/admin/facturacion/configuracion/emisor")
      const sistemaRes = await api.get("/admin/facturacion/configuracion/sistema")

      setFormData((prev: any) => ({
        ...prev, // Mantener estado local si lo hubiera (aunque en loadConfig solemos querer sobrescribir, pero para evitar parpadeos)
        ...res.data.data,
        ...sistemaRes.data.data,
        storage_facturas_folder: sistemaRes.data.data?.storage_facturas_folder || "Facturas emitidas",
        correlativo_inicial: sistemaRes.data.data?.correlativo_inicial || 0,
        migracion_last_serie: sistemaRes.data.data?.migracion_last_serie || "",
        migracion_last_emisor_nif: sistemaRes.data.data?.migracion_last_emisor_nif || "",
        migracion_last_cliente_nif: sistemaRes.data.data?.migracion_last_cliente_nif || "",
        migracion_last_subtotal: sistemaRes.data.data?.migracion_last_subtotal || 0,
        migracion_last_iva: sistemaRes.data.data?.migracion_last_iva || 0,
        migracion_last_total: sistemaRes.data.data?.migracion_last_total || 0,
        migracion_last_pdf: sistemaRes.data.data?.migracion_last_pdf || "",
        migracion_legal_aceptado: sistemaRes.data.data?.migracion_legal_aceptado || false,
        migracion_fecha_aceptacion: sistemaRes.data.data?.migracion_fecha_aceptacion || null
      }))
    } catch (err) {
      console.error(err)
      toast.error("Error cargando configuraci├│n")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Guardar Emisor
      await api.put("/admin/facturacion/configuracion/emisor", formData)

      // 2. Guardar Sistema (Verifactu + Numeracion)
      await api.put("/admin/facturacion/configuracion/sistema", {
        verifactu_activo: formData.verifactu_activo,
        verifactu_modo: formData.verifactu_modo,
        numeracion_tipo: formData.numeracion_tipo,
        numeracion_formato: formData.numeracion_formato,
        storage_facturas_folder: formData.storage_facturas_folder,
        correlativo_inicial: formData.correlativo_inicial,
        migracion_last_serie: formData.migracion_last_serie,
        migracion_last_emisor_nif: formData.migracion_last_emisor_nif,
        migracion_last_cliente_nif: formData.migracion_last_cliente_nif,
        migracion_last_subtotal: formData.migracion_last_subtotal,
        migracion_last_iva: formData.migracion_last_iva,
        migracion_last_total: formData.migracion_last_total,
        migracion_last_pdf: formData.migracion_last_pdf,
        migracion_legal_aceptado: formData.migracion_legal_aceptado
      })

      toast.success("Configuraci├│n guardada correctamente")
    } catch (err: any) {
      console.error(err)
      toast.error("Error al guardar cambios")
    } finally {
      setSaving(false)
    }
  }

  // Placeholder para subida de ficheros (logo/certificado)
  // En producci├│n requerir├¡a un endpoint real con FormData
  const handleFileUploadTrigger = (type: 'logo' | 'certificado' | 'migracion') => {
    if (type === 'logo') logoInputRef.current?.click()
    else if (type === 'certificado') certInputRef.current?.click()
    else migracionInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'certificado' | 'migracion') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validaci├│n b├ísica
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande (m├íx 5MB)")
      return
    }

    try {
      setSaving(true)
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string

        if (type === 'certificado') {
          setPendingCert({ base64: base64String, name: file.name })
          setPassModalOpen(true)
          setSaving(false)
          return
        }

        let endpoint = ""
        if (type === 'logo') endpoint = "/admin/facturacion/configuracion/emisor/logo"
        else endpoint = "/admin/facturacion/configuracion/emisor/upload-evidencia" // Nuevo endpoint sugerido o reusar l├│gica

        try {
          const res = await api.post(endpoint, { file: base64String, fileName: file.name })
          toast.success(type === 'logo' ? "Logo subido correctamente" : "Evidencia de migraci├│n guardada")

          if (type === 'logo') {
            setFormData((prev: any) => ({ ...prev, logo_path: base64String }))
          } else {
            setFormData((prev: any) => ({ ...prev, migracion_last_pdf: res.data.path }))

            // --- LLAMADA AL OCR PARA AUTOCOMPLETADO ---
            toast.promise(
              api.post("/admin/facturacion/configuracion/emisor/ocr-migracion", { file: base64String }),
              {
                loading: 'Analizando factura con OCR inteligente...',
                success: (ocrRes: any) => {
                  const ext = ocrRes.data.data;
                  setFormData((prev: any) => ({
                    ...prev,
                    correlativo_inicial: ext.numeracion.ultimo_numero,
                    migracion_last_serie: ext.numeracion.serie,
                    migracion_last_emisor_nif: ext.identidad.emisor_nif,
                    migracion_last_cliente_nif: ext.identidad.cliente_nif,
                    migracion_last_subtotal: ext.economicos.subtotal,
                    migracion_last_iva: ext.economicos.iva,
                    migracion_last_total: ext.economicos.total
                  }));
                  setOcrConfidence({
                    numeracion: ext.numeracion.confidence,
                    identidad: ext.identidad.confidence,
                    economicos: ext.economicos.confidence
                  });
                  return `Factura analizada. Campos bloqueados por alta fiabilidad: ${ext.numeracion.confidence > 0.9 ? 'Numeraci├│n' : ''} ${ext.economicos.confidence > 0.9 ? 'Econ├│micos' : ''}`;
                },
                error: 'No se pudo extraer informaci├│n autom├ítica, por favor rellena manualmente.'
              }
            );
          }
        } catch (err: any) {
          toast.error(err.response?.data?.error || "Error al subir el archivo")
        } finally {
          setSaving(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      toast.error("Error al procesar el archivo")
      setSaving(false)
    }
  }

  const handleUploadCertWithPass = async () => {
    if (!certPassword) {
      toast.error("Debes introducir la contrase├▒a del certificado")
      return
    }

    try {
      setSaving(true)
      const res = await api.post("/admin/facturacion/configuracion/emisor/certificado", {
        file: pendingCert.base64,
        fileName: pendingCert.name,
        password: certPassword
      })
      toast.success("Certificado subido correctamente")
      setPassModalOpen(false)
      setCertPassword("")
      // Actualizamos solo la info del certificado localmente
      setFormData((prev: any) => ({
        ...prev,
        certificado_path: pendingCert.name,
        certificado_upload_date: new Date().toISOString(),
        certificado_info: res.data.data
      }))
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error al subir certificado")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveCertificate = async () => {
    try {
      setSaving(true)
      await api.delete("/admin/facturacion/configuracion/emisor/certificado")
      setFormData((prev: any) => ({
        ...prev,
        certificado_path: "",
        certificado_upload_date: "",
        certificado_info: null
      }))
      toast.success("Certificado eliminado correctamente")
    } catch (err: any) {
      console.error(err)
      toast.error("Error al eliminar el certificado")
    } finally {
      setSaving(false)
    }
  }

  // --- IVA LOGIC ---
  const [ivas, setIvas] = useState<any[]>([])
  const [newIvaPct, setNewIvaPct] = useState("")
  const [newIvaDesc, setNewIvaDesc] = useState("")
  const [addingIva, setAddingIva] = useState(false)
  const [deletingIvaId, setDeletingIvaId] = useState<number | null>(null)

  useEffect(() => {
    loadIvas()
  }, [])

  const loadIvas = async () => {
    try {
      const res = await api.get('/admin/facturacion/iva')
      setIvas(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddIva = async () => {
    if (!newIvaPct) return

    let desc = newIvaDesc;
    if (!desc) {
      const pct = parseInt(newIvaPct);
      desc = LEGAL_IVA_TEXTS[pct] || `IVA ${newIvaPct}%`;
    }

    setAddingIva(true)
    try {
      await api.post('/admin/facturacion/iva', {
        porcentaje: newIvaPct,
        descripcion: desc
      })
      setNewIvaPct("")
      setNewIvaDesc("")
      toast.success("Tipo de IVA a├▒adido con texto legal sugerido")
      loadIvas()
    } catch (err) {
      toast.error("Error al a├▒adir IVA")
    } finally {
      setAddingIva(false)
    }
  }

  const handleDeleteIva = async (id: number) => {
    setDeletingIvaId(id)
    try {
      await api.delete(`/admin/facturacion/iva/${id}`)
      toast.success("Tipo de IVA eliminado")
      loadIvas()
    } catch (err) {
      toast.error("Error al eliminar IVA")
    } finally {
      setDeletingIvaId(null)
    }
  }

  const handleMagicAI = async (type: string) => {
    if (generatingAiField) return
    setGeneratingAiField(type)
    try {
      const res = await api.post("/admin/facturacion/configuracion/generar-texto", { type })
      if (res.data.success) {
        const fieldMap: any = {
          'pie': 'texto_pie',
          'exento': 'texto_exento',
          'rectificativa': 'texto_rectificativa'
        }
        handleChange(fieldMap[type], res.data.text)
        toast.success("Texto generado por IA")
      }
    } catch (err) {
      toast.error("Error al generar texto")
    } finally {
      setGeneratingAiField(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuraci├│n</h1>
          <p className="text-slate-500 text-sm">Gestiona los datos de tu empresa y opciones fiscales</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4 mr-2" /> Guardar Todo</>}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-white p-1 border">
          <TabsTrigger value="empresa" className="data-[state=active]:bg-slate-100 data-[state=active]:text-blue-700 cursor-pointer">
            <Building2 className="w-4 h-4 mr-2" /> Datos Empresa
          </TabsTrigger>
          <TabsTrigger value="factura" className="data-[state=active]:bg-slate-100 data-[state=active]:text-blue-700 cursor-pointer">
            <FileText className="w-4 h-4 mr-2" /> Personalizaci├│n
          </TabsTrigger>
          <TabsTrigger value="verifactu" className="data-[state=active]:bg-slate-100 data-[state=active]:text-blue-700 cursor-pointer">
            <ShieldCheck className="w-4 h-4 mr-2" /> Veri*Factu
          </TabsTrigger>
        </TabsList>

        {/* --- DATOS EMPRESA --- */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Identificaci├│n Fiscal</CardTitle>
              <CardDescription>Datos que aparecer├ín en el encabezado de tus facturas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NIF / CIF</Label>
                  <Input value={formData.nif} onChange={e => handleChange('nif', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Raz├│n Social</Label>
                  <Input value={formData.nombre} onChange={e => handleChange('nombre', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nombre Comercial</Label>
                  <Input value={formData.nombre_comercial} onChange={e => handleChange('nombre_comercial', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email Facturaci├│n</Label>
                  <Input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="w-3 h-3" /> Tel├®fono</Label>
                  <Input value={formData.telefono} onChange={e => handleChange('telefono', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="w-3 h-3" /> Web</Label>
                  <Input value={formData.web} onChange={e => handleChange('web', e.target.value)} placeholder="www.tuempresa.com" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">IBAN Principal</Label>
                  <Input value={formData.iban} onChange={e => handleChange('iban', e.target.value)} placeholder="ES00 0000 ..." />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 space-y-2">
                  <Label>Direcci├│n Fiscal</Label>
                  <Input value={formData.direccion} onChange={e => handleChange('direccion', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CP</Label>
                  <Input value={formData.cp} onChange={e => handleChange('cp', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Poblaci├│n</Label>
                  <Input value={formData.poblacion} onChange={e => handleChange('poblacion', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Provincia</Label>
                  <Input value={formData.provincia} onChange={e => handleChange('provincia', e.target.value)} />
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Label>Datos Registrales</Label>
                <Textarea
                  rows={2}
                  placeholder="Tomo X, Folio Y, Hoja Z..."
                  value={formData.registro_mercantil}
                  onChange={e => handleChange('registro_mercantil', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PERSONALIZACION --- */}
        <TabsContent value="factura">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Logotipo</CardTitle>
                <CardDescription>Imagen visible en el PDF.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="file"
                  ref={logoInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'logo')}
                />
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleFileUploadTrigger('logo')}>
                  {formData.logo_path ? (
                    <img
                      src={formData.logo_path.startsWith('data:') ? formData.logo_path : `/api/uploads/${formData.logo_path}`}
                      alt="Logo"
                      className="max-h-32 object-contain"
                    />
                  ) : (
                    <>
                      <div className="p-4 bg-slate-100 rounded-full">
                        <Upload className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">Click para subir logo</p>
                      <p className="text-xs text-slate-400">PNG o JPG (Max 2MB)</p>
                    </>
                  )}
                </div>
                {formData.logo_path && (
                  <Button variant="outline" size="sm" className="w-full text-red-500 hover:text-red-700" onClick={() => handleChange('logo_path', null)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar Logo
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>IBAN Predeterminado</Label>
                  <Input value={formData.iban} onChange={e => handleChange('iban', e.target.value)} placeholder="ESXX XXXX XXXX XX XXXXXXXXXX" />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Textos Legales</CardTitle>
                <CardDescription>Configura los textos autom├íticos para cumplir con la normativa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>T├®rminos y Condiciones (Pie de PDF)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleMagicAI('pie')}
                      disabled={!!generatingAiField}
                    >
                      {generatingAiField === 'pie' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      {generatingAiField === 'pie' ? "Generando..." : "Generar con IA"}
                    </Button>
                  </div>
                  <Textarea rows={3} value={formData.texto_pie} onChange={e => handleChange('texto_pie', e.target.value)} placeholder="Ej: Inscrita en el Registro Mercantil..." />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Texto para Operaciones Exentas</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleMagicAI('exento')}
                        disabled={!!generatingAiField}
                      >
                        {generatingAiField === 'exento' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                        IA
                      </Button>
                    </div>
                    <Textarea rows={3} value={formData.texto_exento} onChange={e => handleChange('texto_exento', e.target.value)} placeholder="Texto que aparecer├í si el IVA es 0%" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Texto para Rectificativas</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleMagicAI('rectificativa')}
                        disabled={!!generatingAiField}
                      >
                        {generatingAiField === 'rectificativa' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                        IA
                      </Button>
                    </div>
                    <Textarea rows={3} value={formData.texto_rectificativa} onChange={e => handleChange('texto_rectificativa', e.target.value)} placeholder="Referencia a la factura original..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Numeraci├│n de Facturas</CardTitle>
                <CardDescription>Personaliza el formato de tus facturas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {formData.numeracion_locked && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>
                      <strong>Numeraci├│n Bloqueada:</strong> Ya has emitido facturas este a├▒o, por lo que no puedes cambiar el formato de numeraci├│n para evitar saltos o inconsistencias legales.
                    </p>
                  </div>
                )}

                <div className={cn("space-y-3", formData.numeracion_locked && "opacity-50 pointer-events-none")}>
                  <Label className="flex items-center gap-2"><Hash className="w-4 h-4 text-slate-500" /> Tipo de Numeraci├│n</Label>
                  <select
                    className="w-full p-2 rounded-md border text-sm"
                    value={formData.numeracion_tipo}
                    onChange={(e) => handleChange('numeracion_tipo', e.target.value)}
                    disabled={formData.numeracion_locked}
                  >
                    <option value="STANDARD">Continua (F-0001, F-0002...)</option>
                    <option value="BY_YEAR">Por A├▒o (F-2026-0001, F-2026-0002...)</option>
                    <option value="PREFIXED">Con Prefijo (26-0001, 26-0002...)</option>
                  </select>
                  <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 space-y-1">
                    <p><strong>Ayuda:</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Continua:</strong> Secuencial simple. Ideal para la mayor├¡a.</li>
                      <li><strong>Por A├▒o:</strong> Reinicia el contador cada a├▒o (ej: F-2026-0001).</li>
                      <li><strong>Con Prefijo:</strong> A├▒ade un c├│digo personalizado (ej: SERIE A-001).</li>
                    </ul>
                  </div>
                </div>

                {formData.numeracion_tipo === 'PREFIXED' && (
                  <div className={cn("space-y-3 pt-2 border-t mt-2", formData.numeracion_locked && "opacity-50 pointer-events-none")}>
                    <Label>Formato del Prefijo Personalizado</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.numeracion_formato || ''}
                        onChange={(e) => handleChange('numeracion_formato', e.target.value)}
                        placeholder="Ej: SERIE-{YEAR}-"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleChange('numeracion_formato', (formData.numeracion_formato || '') + '{YEAR}')} className="text-xs">+ A├▒o</Button>
                      <Button size="sm" variant="outline" onClick={() => handleChange('numeracion_formato', (formData.numeracion_formato || '') + '{MONTH}')} className="text-xs">+ Mes</Button>
                      <Button size="sm" variant="outline" onClick={() => handleChange('numeracion_formato', (formData.numeracion_formato || '') + '{DAY}')} className="text-xs">+ D├¡a</Button>
                    </div>

                    <div className="bg-blue-50 p-3 rounded border border-blue-100 text-blue-800 text-sm">
                      <strong>Vista Previa: </strong>
                      <span className="font-mono bg-white px-1 rounded ml-1">
                        {(formData.numeracion_formato || 'FAC-')
                          .replace('{YEAR}', new Date().getFullYear().toString())
                          .replace('{MONTH}', (new Date().getMonth() + 1).toString().padStart(2, '0'))
                          .replace('{DAY}', new Date().getDate().toString().padStart(2, '0'))
                        }0001
                      </span>
                    </div>
                  </div>
                )}

                <Separator className="mt-6" />

                <div className="pt-4 space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Sparkles className="w-5 h-5" />
                    <h4 className="font-bold">Asistente de Migraci├│n Fiscal</h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Si vienes de otro programa, configura aqu├¡ tu ├║ltimo n├║mero para continuar la serie legalmente.
                  </p>

                  <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", formData.numeracion_locked && "opacity-60 pointer-events-none")}>
                    <div className="space-y-2">
                      <Label>├Ültimo N├║mero Emitido</Label>
                      <Input
                        type="number"
                        value={formData.correlativo_inicial}
                        onChange={e => handleChange('correlativo_inicial', parseInt(e.target.value))}
                        placeholder="Ej: 145"
                        disabled={ocrConfidence.numeracion > 0.9}
                        className={cn(ocrConfidence.numeracion > 0.9 && "bg-slate-100 font-bold")}
                      />
                      <p className="text-[10px] text-slate-400">La pr├│xima factura ser├í el {(parseInt(formData.correlativo_inicial) || 0) + 1}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>├Ültima Serie (Audit)</Label>
                      <Input
                        value={formData.migracion_last_serie}
                        onChange={e => handleChange('migracion_last_serie', e.target.value)}
                        placeholder="Ej: B-2024"
                        disabled={ocrConfidence.numeracion > 0.9}
                        className={cn(ocrConfidence.numeracion > 0.9 && "bg-slate-100")}
                      />
                    </div>
                  </div>

                  {/* Fila de Datos de Identidad (Audit) */}
                  <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", formData.numeracion_locked && "opacity-60 pointer-events-none")}>
                    <div className="space-y-2">
                      <Label className="text-xs">NIF Emisor (PDF)</Label>
                      <Input
                        value={formData.migracion_last_emisor_nif}
                        onChange={e => handleChange('migracion_last_emisor_nif', e.target.value)}
                        disabled={ocrConfidence.identidad > 0.9}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">NIF Cliente (PDF)</Label>
                      <Input
                        value={formData.migracion_last_cliente_nif}
                        onChange={e => handleChange('migracion_last_cliente_nif', e.target.value)}
                        disabled={ocrConfidence.identidad > 0.9}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  {/* Fila de Datos Econ├│micos (Audit) */}
                  <div className={cn("p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex gap-4", formData.numeracion_locked && "opacity-60")}>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] uppercase text-slate-500">Subtotal</Label>
                      <Input
                        type="number"
                        value={formData.migracion_last_subtotal}
                        onChange={e => handleChange('migracion_last_subtotal', parseFloat(e.target.value))}
                        disabled={ocrConfidence.economicos > 0.9}
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] uppercase text-slate-500">IVA</Label>
                      <Input
                        type="number"
                        value={formData.migracion_last_iva}
                        onChange={e => handleChange('migracion_last_iva', parseFloat(e.target.value))}
                        disabled={ocrConfidence.economicos > 0.9}
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] uppercase text-blue-600 font-bold">Total Factura</Label>
                      <Input
                        type="number"
                        value={formData.migracion_last_total}
                        onChange={e => handleChange('migracion_last_total', parseFloat(e.target.value))}
                        disabled={ocrConfidence.economicos > 0.9}
                        className="h-7 text-xs bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className={cn("grid grid-cols-1 gap-4", formData.numeracion_locked && "opacity-60 pointer-events-none")}>
                    <div className="space-y-2">
                      <Label>Evidencia de Cierre (PDF)</Label>
                      <input
                        type="file"
                        ref={migracionInputRef}
                        className="hidden"
                        accept="application/pdf"
                        onChange={(e) => handleFileChange(e, 'migracion')}
                      />
                      <Button
                        variant="outline"
                        className="w-full flex justify-between h-10 px-3 font-normal"
                        onClick={() => handleFileUploadTrigger('migracion')}
                      >
                        <span className="truncate">{formData.migracion_last_pdf ? "Ô£ô Factura subida" : "Subir ├║ltima factura..."}</span>
                        <Upload className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>

                  <div className={cn("p-4 rounded-lg border bg-slate-50 space-y-3", formData.numeracion_locked && "opacity-60")}>
                    <div className="flex items-start gap-3">
                      <Switch
                        checked={formData.migracion_legal_aceptado}
                        onCheckedChange={v => handleChange('migracion_legal_aceptado', v)}
                        disabled={formData.numeracion_locked}
                      />
                      <div className="space-y-1">
                        <Label className="text-xs font-bold leading-none">Aceptaci├│n de Responsabilidad Legal</Label>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          Confirmo que el n├║mero inicial coincide con mi contabilidad previa. Entiendo que una numeraci├│n incorrecta puede acarrear sanciones de la AEAT y eximo a la plataforma de cualquier responsabilidad por duplicidad o saltos en la serie.
                        </p>
                      </div>
                    </div>
                    {formData.migracion_fecha_aceptacion && (
                      <p className="text-[10px] text-blue-600 text-right">
                        Aceptado el {new Date(formData.migracion_fecha_aceptacion).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Almacenamiento de Facturas</CardTitle>
                <CardDescription>Organizaci├│n autom├ítica de tus archivos PDF.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Nombre de Carpeta Ra├¡z</Label>
                  <Input
                    value={formData.storage_facturas_folder}
                    onChange={e => handleChange('storage_facturas_folder', e.target.value)}
                    placeholder="Ej: Facturas emitidas"
                  />
                  <p className="text-xs text-slate-500">
                    Las facturas se guardar├ín en:
                    <span className="font-mono bg-slate-100 px-1 rounded ml-1">
                      {(formData.storage_facturas_folder || 'Facturas emitidas').trim()}/{new Date().getFullYear()}/T{Math.floor(new Date().getMonth() / 3) + 1}
                    </span>
                  </p>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>Revisa el espacio disponible en la secci├│n de "Almacenamiento" para evitar interrupciones al generar PDFs.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impuestos (IVA)</CardTitle>
                <CardDescription>Define los tipos de IVA aplicables.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="%"
                      type="number"
                      className="w-24"
                      value={newIvaPct}
                      onChange={(e) => setNewIvaPct(e.target.value)}
                    />
                    <Input
                      placeholder="Descripci├│n o texto exenci├│n..."
                      className="flex-1"
                      value={newIvaDesc}
                      onChange={(e) => setNewIvaDesc(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleAddIva} disabled={addingIva}>
                      {addingIva ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> A├▒adir</>}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    * La descripci├│n se sugerir├í como nota de IVA al crear facturas con este porcentaje.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  {ivas.map((iva: any) => (
                    <div key={iva.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{iva.porcentaje}%</span>
                        <span className="text-xs text-slate-500 italic truncate max-w-[200px] md:max-w-xs" title={iva.descripcion}>
                          {iva.descripcion || 'Sin descripci├│n'}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteIva(iva.id)} disabled={deletingIvaId === iva.id} className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50">
                        {deletingIvaId === iva.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- VERIFACTU --- */}
        <TabsContent value="verifactu">
          <Card className="border-blue-100 bg-blue-50/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Cumplimiento Normativo
              </CardTitle>
              <CardDescription>Configuraci├│n del sistema de emisi├│n verificable (Ley Antifraude).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
                <div className="space-y-1">
                  <Label className="text-base">Activar Veri*Factu</Label>
                  <p className="text-sm text-slate-500">Habilita el encadenamiento de hashes y env├¡o a la AEAT.</p>
                </div>
                <Switch
                  checked={formData.verifactu_activo}
                  onCheckedChange={checked => handleChange('verifactu_activo', checked)}
                />
              </div>

              {formData.verifactu_activo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Label className="flex items-center gap-2"> Estado del Sistema</Label>
                    <div className="p-3 bg-slate-50 rounded border text-sm text-slate-600">
                      El sistema enviar├í autom├íticamente las facturas a la AEAT seg├║n la configuraci├│n de modo seleccionada.
                    </div>
                    <div className="space-y-3">
                      <Label>Modo de Operaci├│n Veri*Factu</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleChange('verifactu_modo', 'TEST')}
                          className={`p-3 rounded-md border text-sm font-medium transition-colors ${formData.verifactu_modo === 'TEST' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                        >
                          ENTORNO TEST
                        </button>
                        <button
                          onClick={() => handleChange('verifactu_modo', 'PROD')}
                          className={`p-3 rounded-md border text-sm font-medium transition-colors ${formData.verifactu_modo === 'PROD' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                        >
                          PRODUCCI├ôN
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        ÔÜá´©Å El modo producci├│n enviar├í datos reales a Hacienda.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label>Certificado Digital</Label>
                      <input
                        type="file"
                        ref={certInputRef}
                        className="hidden"
                        accept=".pfx,.p12"
                        onChange={(e) => handleFileChange(e, 'certificado')}
                      />
                      <div className="border border-dashed rounded-lg p-4 bg-white flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded ${formData.certificado_path ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-slate-900">
                              {formData.certificado_path ? "Certificado Activo" : "No configurado"}
                            </p>

                            {formData.certificado_info ? (
                              <div className="text-xs text-slate-600 space-y-2 mt-2 p-3 bg-slate-50 rounded border border-slate-100">
                                <div>
                                  <span className="font-semibold text-slate-700 block mb-1">Titular (Sujeto):</span>
                                  <span className="font-mono text-slate-600 break-all">{formData.certificado_info.subject}</span>
                                </div>
                                <div className="flex gap-4">
                                  <div>
                                    <span className="font-semibold text-slate-700 block mb-1">Emisor:</span>
                                    <span className="text-slate-500">{formData.certificado_info.issuer || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-700 block mb-1">Validez:</span>
                                    <span className={`${new Date(formData.certificado_info.validTo) < new Date() ? 'text-red-500 font-bold' : 'text-green-600 font-medium'}`}>
                                      hasta el {new Date(formData.certificado_info.validTo).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : formData.certificado_upload_date && (
                              <p className="text-xs text-slate-400">Subido el: {new Date(formData.certificado_upload_date).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          {formData.certificado_path && (
                            <Button size="sm" variant="destructive" onClick={handleRemoveCertificate} disabled={saving} className="h-8 text-xs">
                              <Trash2 className="w-3 h-3 mr-1" /> Retirar
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleFileUploadTrigger('certificado')} disabled={saving} className="h-8 text-xs">
                            {formData.certificado_path ? "Sustituir" : "Subir Certificado"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <Dialog open={passModalOpen} onOpenChange={setPassModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); handleUploadCertWithPass(); }}>
            <DialogHeader>
              <DialogTitle>Contrase├▒a del Certificado</DialogTitle>
              <DialogDescription>
                Introduce la contrase├▒a para poder instalar el certificado digital.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pass">Contrase├▒a</Label>
                <Input
                  id="pass"
                  name="certificate_password"
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPassModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</> : "Validar y Subir"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConfigSkeleton() {
  return <div className="space-y-6 max-w-4xl mx-auto"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>
}
