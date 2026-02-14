"use client";

import { useEffect, useRef } from "react";
import { get } from 'idb-keyval';
import { api } from "@/services/api";
import { toast } from "sonner";

/**
 * Componente invisible que gestiona la sincronización automática del backup
 * del servidor a la carpeta local configurada en el navegador.
 */
export default function AutoBackupSync() {
    const syncDone = useRef(false);

    // Función para solicitar la carpeta (gesto de usuario)
    const pickFolderAndSync = async () => {
        try {
            if (!('showDirectoryPicker' in window)) {
                toast.error("Tu navegador no soporta la selección de carpetas avanzada.");
                return;
            }
            const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
            const { set } = await import('idb-keyval');
            await set('backup_directory_handle', handle);
            toast.success("Carpeta vinculada. Sincronizando...");
            // Ejecutar sync inmediatamente tras vincular
            syncDone.current = false;
            await runSync();
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error(err);
                toast.error("Error al vincular carpeta.");
            }
        }
    };

    const runSync = async () => {
        if (syncDone.current) return;

        try {
            // 1. Obtener configuración del servidor
            let serverPath = null;
            try {
                const res = await api.get("/admin/facturacion/configuracion/sistema");
                serverPath = res.data?.data?.backup_local_path;
            } catch (e) {
                console.error("[AutoBackupSync] Error obteniendo config del servidor");
            }

            // 2. Obtener el handle de la carpeta guardado en IndexedDB
            const { get } = await import('idb-keyval');
            const directoryHandle = await get('backup_directory_handle');

            if (!directoryHandle) {
                if (serverPath) {
                    console.warn(`[AutoBackupSync] El servidor tiene una ruta de backup (${serverPath}), pero el navegador NO tiene una carpeta vinculada en este PC.`);
                    toast.info("Configuración de Backup detectada", {
                        description: "Vincular una carpeta de este PC para recibir las copias automáticas.",
                        action: {
                            label: "Vincular PC ahora",
                            onClick: () => pickFolderAndSync()
                        },
                        duration: Infinity
                    });
                }
                return;
            }

            // 3. Verificar permisos
            const options = { mode: 'readwrite' };
            if ((await directoryHandle.queryPermission(options)) !== 'granted') {
                // Si estamos en una ruta relevante, pedir permiso mediante toast
                const isRelevantPath = window.location.pathname === '/admin/dashboard' || window.location.pathname.includes('configuracion');
                if (isRelevantPath) {
                    toast.info("Acceso a carpeta de Backup", {
                        description: "Se requiere permiso para escribir en tu carpeta local configurada.",
                        action: {
                            label: "Permitir ahora",
                            onClick: async () => {
                                if ((await directoryHandle.requestPermission(options)) === 'granted') {
                                    syncDone.current = false;
                                    runSync();
                                }
                            }
                        },
                        duration: 10000
                    });
                }
                return;
            }

            console.log("[AutoBackupSync] Iniciando sincronización de backup automático...");
            syncDone.current = true;

            // 4. Descargar el backup actual
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/backup/download`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const blob = await response.blob();
            const filename = "backup_auto.json";

            // 5. Escribir en PC
            const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            console.log(`[AutoBackupSync] ✅ Backup sincronizado en PC: ${filename}`);
            toast.success("Respaldo local sincronizado en este PC.");

        } catch (err) {
            console.error("[AutoBackupSync] Error en sincronización:", err);
        }
    };

    useEffect(() => {
        const timer = setTimeout(runSync, 4000);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
