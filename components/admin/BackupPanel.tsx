"use client";

import { useState, useRef } from "react";
import { api } from "@/services/api";
import { showSuccess, showError, showPromise } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, RefreshCw, Save, Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function BackupPanel() {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleForceBackup() {
    if (loading) return;
    setLoading(true);
    
    const promise = api.post("/admin/backup/force");
    
    showPromise(promise, {
      loading: "Generando copia de seguridad...",
      success: "Copia de seguridad guardada correctamente en el Storage.",
      error: "Error al generar la copia de seguridad."
    });

    try {
      await promise;
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadLocal() {
    if (loading) return
    setLoading(true)
    
    // Usamos fetch directo para manejar el blob
    const promise = (async () => {
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/backup/download`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        
        if (!response.ok) throw new Error("Error descargando backup")
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        // El nombre viene en header o generamos uno
        a.download = `backup_restore_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    })()

    showPromise(promise, {
        loading: "Preparando descarga...",
        success: "Copia descargada correctamente",
        error: "Error al descargar la copia"
    })
    
    try {
        await promise
    } finally {
        setLoading(false)
    }
  }

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      // Confirmación extra fuerte
      const confirmed = window.confirm(`⚠️ ADVERTENCIA CRÍTICA:\n\nSe van a BORRAR TODOS LOS DATOS actuales y se reemplazarán por el contenido del archivo:\n"${file.name}"\n\nEsta acción es irreversible.\n¿Estás absolutamente seguro de continuar?`)
      
      if (!confirmed) {
           e.target.value = '' // Reset input
           return
      }

      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)

      const promise = (async () => {
          const token = localStorage.getItem('token')
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/backup/restore-upload`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`
              },
              body: formData
          })
          const data = await response.json()
          if (!response.ok || !data.success) throw new Error(data.error || "Error en restauración")
          return data
      })()

      showPromise(promise, {
          loading: "Subiendo y restaurando copia local...",
          success: "Sistema restaurado correctamente desde archivo local.",
          error: "Error restaurando copia local."
      })

      try {
          await promise
          setTimeout(() => window.location.reload(), 2000)
      } catch (err) {
          // Error handled by toast
      } finally {
          setLoading(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
      }
  }

  async function handleRestoreBackup() {
    if (loading) return;
    setLoading(true);

    const promise = api.post("/admin/backup/restore");

    showPromise(promise, {
      loading: "Restaurando sistema... esto puede tardar unos segundos.",
      success: "Sistema restaurado correctamente desde la última copia.",
      error: "Error al restaurar. Verifica que exista una copia previa."
    });

    try {
      await promise;
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4 border-l-4 border-amber-500">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Salvaguarda y Restauración</h3>
          <p className="text-sm text-gray-500">
            Gestiona las copias de seguridad del sistema. Se genera una copia automática cada vez que un administrador inicia sesión.
            Estas copias se guardan en el Storage de la empresa bajo el nombre <code>backup_auto.json</code>.
          </p>
        </div>
      </div>

      {/* Inputs ocultos */}
      <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".json" 
            onChange={handleFileRestore} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Generar Backup */}
        <Button 
          variant="outline" 
          onClick={handleForceBackup} 
          disabled={loading}
          className="gap-2 border-gray-300 hover:bg-gray-50 justify-start"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Generar Backup (Storage)
        </Button>

        {/* Descargar Local */}
        <Button 
          variant="outline" 
          onClick={handleDownloadLocal} 
          disabled={loading}
          className="gap-2 border-gray-300 hover:bg-gray-50 justify-start"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Descargar Copia Local
        </Button>

        {/* Restaurar Storage */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={loading}
              className="gap-2 bg-red-600 hover:bg-red-700 justify-start"
            >
              <RefreshCw className="w-4 h-4" />
              Restaurar Última Copia (Storage)
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                ¿Estás completamente seguro?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Esta acción <strong>BORRARÁ TODOS LOS DATOS ACTUALES</strong> de la empresa y los reemplazará por la última copia de seguridad disponible en el Storage.
                </p>
                <p>
                  Esto incluye empleados, clientes, facturas, fichajes y configuraciones.
                  <br/>
                  <strong>Esta acción no se puede deshacer.</strong>
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                   e.preventDefault(); 
                   handleRestoreBackup();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Sí, restaurar sistema
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Restaurar Local */}
        <Button 
            variant="destructive" 
            className="gap-2 bg-red-800 hover:bg-red-900 justify-start" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={loading}
        >
            <Upload className="w-4 h-4" />
            Restaurar desde Archivo Local
        </Button>

      </div>
    </div>
  );
}
