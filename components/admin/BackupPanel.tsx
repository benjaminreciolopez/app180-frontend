"use client";

import { useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError, showPromise } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, RefreshCw, Save } from "lucide-react";
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
      // Recargar la página para reflejar cambios críticos (logout forzado o reload)
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
          <h3 className="text-lg font-semibold text-gray-900">Salvagurda y Restauración</h3>
          <p className="text-sm text-gray-500">
            Gestiona las copias de seguridad del sistema. Se genera una copia automática cada vez que un administrador inicia sesión.
            Estas copias se guardan en el Storage de la empresa bajo el nombre <code>backup_auto.json</code>.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {/* Forzar Backup */}
        <Button 
          variant="outline" 
          onClick={handleForceBackup} 
          disabled={loading}
          className="flex-1 gap-2 border-gray-300 hover:bg-gray-50"
        >
          <Save className="w-4 h-4" />
          Forzar Copia de Seguridad Ahora
        </Button>

        {/* Restaurar Backup */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={loading}
              className="flex-1 gap-2 bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4" />
              Restaurar Última Copia
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
                  Esta acción <strong>BORRARÁ TODOS LOS DATOS ACTUALES</strong> de la empresa y los reemplazará por la última copia de seguridad disponible.
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
                   e.preventDefault(); // Evitar cierre automático para manejar async si quisiéramos, pero aquí llamamos a la funcion
                   handleRestoreBackup();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Sí, restaurar sistema
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
