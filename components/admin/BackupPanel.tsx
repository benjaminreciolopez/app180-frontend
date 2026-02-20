import { useState, useRef, useEffect } from "react";
import { api } from "@/services/api";
import { showSuccess, showError, showPromise } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, RefreshCw, Save, Download, Upload, Loader2, FolderCog } from "lucide-react";
import { toast } from "sonner";
import { get, set } from 'idb-keyval';
import { cn } from "@/lib/utils";
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
  const [directoryHandle, setDirectoryHandle] = useState<any>(null); // FS Handle
  const [serverBackupPath, setServerBackupPath] = useState<string>("");
  const [savingPath, setSavingPath] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Intentar recuperar el handle guardado
    get('backup_directory_handle').then((handle) => {
      if (handle) {
        setDirectoryHandle(handle);
        console.log("Directorio de backup recuperado de IndexedDB");
      }
    });

    // Cargar configuración del servidor para la ruta persistente
    loadServerConfig();
  }, []);

  async function loadServerConfig() {
    try {
      const res = await api.get("/admin/facturacion/configuracion/sistema");
      if (res.data?.success) {
        setServerBackupPath(res.data.data.backup_local_path || "");
      }
    } catch (err) {
      console.error("Error cargando configuración de backup del servidor", err);
    }
  }

  async function handleSaveServerPath() {
    setSavingPath(true);
    try {
      await api.put("/admin/facturacion/configuracion/sistema", {
        backup_local_path: serverBackupPath
      });
      showSuccess("Ruta de backup en servidor actualizada");
    } catch (err) {
      showError("Error al guardar la ruta en el servidor");
    } finally {
      setSavingPath(false);
    }
  }

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

  async function handleConfigureFolder() {
    try {
      if (!('showDirectoryPicker' in window)) {
        toast.error("Tu navegador no soporta la selección de carpetas avanzada.");
        return;
      }
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      await set('backup_directory_handle', handle);
      setDirectoryHandle(handle);
      toast.success("Carpeta de backups configurada correctamente.");
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        toast.error("Error al configurar carpeta.");
      }
    }
  }

  // Verificar permisos del handle
  async function verifyPermission(handle: any, readWrite: boolean) {
    const options = { mode: readWrite ? 'readwrite' : 'read' };
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  }

  async function handleDownloadLocal() {
    if (loading) return
    setLoading(true)

    // Generar nombre de archivo
    const filename = "backup_auto.json";

    // Flow con File System Access API
    if (directoryHandle) {
      try {
        // Verificar permisos
        const hasPermission = await verifyPermission(directoryHandle, true);
        if (!hasPermission) {
          toast.error("Permiso denegado para acceder a la carpeta configurada.");
          // Fallback a descarga normal? O re-pedir carpeta?
          // Mejor continuamos con descarga normal o error.
          // Intentamos re-pedir permiso arriba, si falla, removemos handle?
          // setDirectoryHandle(null); // Opcional
          setLoading(false);
          return;
        }

        // Descargar datos
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/backup/download`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error("Error obteniendo datos del backup");
        const blob = await response.blob();

        // Guardar en directorio
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        toast.success(`Backup guardado en carpeta configurada: ${filename}`);
        setLoading(false);
        return; // Fin existoso FS API

      } catch (err: any) {
        console.error("Error guardando en carpeta configurada:", err);
        toast.error("Error guardando en carpeta local. Intentando descarga normal...");
        // Si falla, hacemos fallback a descarga normal
      }
    }

    // Fallback: Descarga Normal (blob url)
    const promise = (async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/backup/download`, {
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
      a.download = filename
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

      {/* Sección 1: Ruta en el Servidor (Nube) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-slate-700">
          <Database className="w-5 h-5" />
          <h4 className="font-bold text-sm uppercase tracking-wider">Copia en Servidor (Render/Internal)</h4>
        </div>
        <p className="text-[11px] text-slate-500">
          Esta ruta es **interna del servidor en la nube**. Solo sirve para persistencia dentro de Render.
          Rutas de Windows como <code>C:\...</code> no funcionarán aquí si el servidor está en la nube.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: /app/backups/data.json"
            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={serverBackupPath}
            onChange={(e) => setServerBackupPath(e.target.value)}
          />
          <Button
            onClick={handleSaveServerPath}
            disabled={savingPath}
            variant="secondary"
            className="bg-slate-200 hover:bg-slate-300 text-slate-700"
          >
            {savingPath ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Ruta"}
          </Button>
        </div>
      </div>

      {/* Sección 2: Sincronización con ESTE EQUIPO (PC Real) */}
      <div className="bg-green-50/50 p-4 rounded-xl border border-green-200 space-y-3">
        <div className="flex items-center gap-2 text-green-700">
          <FolderCog className="w-5 h-5" />
          <h4 className="font-bold text-sm uppercase tracking-wider text-green-800">Sincronización con TU ORDENADOR (PC)</h4>
        </div>
        <p className="text-xs text-green-700/80 leading-relaxed font-medium">
          ⚠️ **ACTIVA ESTO** para que la copia se guarde físicamente en una carpeta de tu ordenador cada vez que inicies sesión.
        </p>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="outline"
            onClick={handleConfigureFolder}
            disabled={loading}
            className={cn(
              "gap-2 border-green-300 hover:bg-green-100 transition-all font-bold",
              directoryHandle ? "bg-green-600 text-white border-green-700 hover:bg-green-700 hover:text-white" : "text-green-700"
            )}
          >
            <FolderCog className="w-4 h-4" />
            {directoryHandle ? "✓ Carpeta vinculada en este PC" : "Vincular carpeta de este PC"}
          </Button>

          {directoryHandle && (
            <span className="text-[10px] text-green-600 italic">
              Sincronización automática activada en este navegador.
            </span>
          )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {/* Generar Backup */}
        <Button
          variant="outline"
          onClick={handleForceBackup}
          disabled={loading}
          className="gap-2 border-gray-300 hover:bg-gray-50 justify-start"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Generar y Subir (Storage)
        </Button>

        {/* Configurar Carpeta */}
        <Button
          variant="outline"
          onClick={handleConfigureFolder}
          disabled={loading}
          className={cn("gap-2 border-gray-300 hover:bg-gray-50 justify-start", directoryHandle ? "border-green-500 bg-green-50 text-green-700" : "")}
          title={directoryHandle ? "Carpeta configurada (Click para cambiar)" : "Configurar carpeta de descargas"}
        >
          <FolderCog className="w-4 h-4" />
          {directoryHandle ? "Carpeta Configurada" : "Configurar Carpeta Local"}
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
              className="gap-2 bg-red-600 hover:bg-red-700 justify-start md:col-span-1 lg:col-span-1"
            >
              <RefreshCw className="w-4 h-4" />
              Restaurar (Storage)
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
                  Esta acción <strong>BORRARÁ TODOS LOS DATOS ACTUALES</strong> de la empresa y los reemplazará por la última copia de seguridad del Storage.
                </p>
                <p>
                  Esto incluye empleados, clientes, facturas, fichajes y configuraciones.
                  <br />
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
          className="gap-2 bg-red-800 hover:bg-red-900 justify-start md:col-span-1 lg:col-span-2"
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
