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

    useEffect(() => {
        // Solo intentar sincronizar una vez por sesión de carga de página
        if (syncDone.current) return;

        const sync = async () => {
            try {
                // 1. Obtener el handle de la carpeta guardado en IndexedDB
                const directoryHandle = await get('backup_directory_handle');
                if (!directoryHandle) {
                    console.log("[AutoBackupSync] No hay carpeta local configurada para sincronización.");
                    return;
                }

                // 2. Verificar permisos (el navegador puede pedirlos de nuevo)
                const options = { mode: 'readwrite' };
                if ((await directoryHandle.queryPermission(options)) !== 'granted') {
                    // Si no tiene permisos, no queremos molestar con popups en cada página
                    // Solo lo intentamos si estamos en una ruta de configuración o dashboard inicial
                    const isRelevantPath = window.location.pathname === '/admin/dashboard' || window.location.pathname.includes('configuracion');
                    if (!isRelevantPath) return;

                    // Pedimos permiso
                    if ((await directoryHandle.requestPermission(options)) !== 'granted') {
                        console.warn("[AutoBackupSync] Permiso denegado para la carpeta de backup.");
                        return;
                    }
                }

                console.log("[AutoBackupSync] Iniciando sincronización de backup automático...");
                syncDone.current = true;

                // 3. Descargar el backup actual del servidor
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/backup/download`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    console.error("[AutoBackupSync] Error al descargar el backup del servidor.");
                    return;
                }

                const blob = await response.blob();
                const filename = "backup_auto.json";

                // 4. Escribir en la carpeta local (sobrescribir siempre el auto)
                const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();

                console.log(`[AutoBackupSync] ✅ Backup sincronizado en PC: ${filename}`);

                // Notificación discreta
                toast.success("Respaldo local sincronizado correctamente.", {
                    description: "Se ha guardado una copia en tu carpeta configurada.",
                    duration: 3000
                });

            } catch (err) {
                console.error("[AutoBackupSync] Error en sincronización:", err);
            }
        };

        // Esperar un poco tras la carga de la app para no bloquear
        const timer = setTimeout(sync, 5000);
        return () => clearTimeout(timer);
    }, []);

    return null; // Componente invisible
}
