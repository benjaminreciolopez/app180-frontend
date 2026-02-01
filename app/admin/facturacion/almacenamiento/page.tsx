"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  HardDrive, 
  Folder, 
  FileText, 
  Download, 
  Trash2, 
  Upload, 
  Search,
  ChevronRight,
  MoreVertical,
  Plus,
  FileIcon,
  Clock,
  LayoutGrid,
  List,
  Loader2,
  ArrowLeft,
  FolderOpen
} from "lucide-react"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface FileInfo {
  id: string
  nombre: string
  folder: string
  mime_type: string
  size_bytes: number
  created_at: string
}

interface StorageStats {
  used_bytes: number
  total_limit_bytes: number
}

// Tipo unificado para mostrar en el grid
type GridItem = 
  | { type: 'folder', name: string, fullPath: string }
  | { type: 'file', data: FileInfo }

export default function AlmacenamientoPage() {
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(true)
  
  // Estado real de los datos
  const [allDefinedPaths, setAllDefinedPaths] = useState<string[]>([])
  const [currentFiles, setCurrentFiles] = useState<FileInfo[]>([])
  const [stats, setStats] = useState<StorageStats | null>(null)
  
  // Estado de navegación
  const [currentPath, setCurrentPath] = useState<string>("") // "" es Root
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [uploading, setUploading] = useState(false)

  // 1. Cargar la estructura de carpetas (todas las rutas existentes)
  const fetchStructure = async () => {
      try {
          setLoadingFolders(true)
          const res = await api.get('/admin/storage/folders')
          if (res.data.success) {
              const paths = res.data.data || []
              // Asegurar que "Facturas emitidas" exista si está vacío
              if (paths.length === 0) {
                 setAllDefinedPaths(["Facturas emitidas"])
              } else {
                 setAllDefinedPaths(paths)
              }
          }
      } catch (err) {
          console.error("Error fetching folders", err)
          // Fallback seguro
          setAllDefinedPaths(["Facturas emitidas"])
      } finally {
          setLoadingFolders(false)
      }
  }

  // 2. Cargar archivos de la carpeta actual (exact match)
  const fetchFiles = async () => {
    try {
      setLoadingFiles(true)
      // Si estamos en root, normalmente no hay archivos, pero consultamos igual con folder="" o folder="/"
      // El backend espera 'folder' como query param. 
      const res = await api.get(`/admin/storage/files?folder=${currentPath}`)
      if (res.data.success) {
        setCurrentFiles(res.data.data)
        setStats(res.data.stats)
      }
    } catch (err) {
      console.error("Error fetching files", err)
      toast.error("Error al cargar archivos")
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    fetchStructure()
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [currentPath])

  // 3. Calcular subcarpetas basándonos en 'currentPath' y 'allDefinedPaths'
  const subFolders = useMemo(() => {
    if (loadingFolders) return []
    
    const subs = new Set<string>()
    const prefix = currentPath ? `${currentPath}/` : ""
    
    allDefinedPaths.forEach(path => {
      if (path.startsWith(prefix)) {
        // Ejemplo: path="Facturas/2026/T1", current="" -> prefix=""
        // remainder="Facturas/2026/T1" -> segment="Facturas"
        
        // Ejemplo: path="Facturas/2026/T1", current="Facturas" -> prefix="Facturas/"
        // remainder="2026/T1" -> segment="2026"
        
        const remainder = path.slice(prefix.length)
        if (remainder) {
          const firstSegment = remainder.split('/')[0]
          if (firstSegment) subs.add(firstSegment)
        }
      }
    })
    
    return Array.from(subs).sort()
  }, [allDefinedPaths, currentPath, loadingFolders])

  // 4. Items combinados para el Grid (Carpetas + Archivos) filtrados por búsqueda
  const gridItems: GridItem[] = useMemo(() => {
    let items: GridItem[] = []
    
    // Agregar carpetas primero
    items = items.concat(subFolders.map(name => ({
      type: 'folder',
      name,
      fullPath: currentPath ? `${currentPath}/${name}` : name
    })))
    
    // Agregar archivos
    items = items.concat(currentFiles.map(file => ({
      type: 'file',
      data: file
    })))

    // Filtrar por búsqueda
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      items = items.filter(item => {
        if (item.type === 'folder') return item.name.toLowerCase().includes(lower)
        return item.data.nombre.toLowerCase().includes(lower)
      })
    }
    
    return items
  }, [subFolders, currentFiles, searchTerm, currentPath])

  // Acciones
  const handleNavigate = (path: string) => {
    setSearchTerm("") // Limpiar búsqueda al navegar
    setCurrentPath(path)
  }

  const handleNavigateUp = () => {
    if (!currentPath) return
    const parts = currentPath.split('/')
    parts.pop()
    handleNavigate(parts.join('/'))
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este archivo?")) return
    try {
      await api.delete(`/admin/storage/files/${id}`)
      toast.success("Archivo eliminado")
      fetchFiles() // Recargar archivos
      // No recargamos estructura completa a menos que sea critico, 
      // pero si borramos el ultimo archivo de una carpeta, esa carpeta desaparece conceptualmente
      // asi que quizas deberiamos:
      fetchStructure() 
    } catch (err) {
      toast.error("Error al eliminar")
    }
  }

  const handleDownload = async (id: string, nombre: string) => {
    try {
      const response = await api.get(`/admin/storage/files/${id}/download`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', nombre)
      document.body.appendChild(link)
      link.click()
      
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast.error("Error al descargar el archivo")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Si estamos en root, no deberíamos dejar subir archivos sueltos idealmente, 
    // pero si el usuario quiere, se crea en "general" o similar, 
    // O mejor, forzamos carpeta 'General' si currentPath vacio.
    const targetFolder = currentPath || "General"

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', targetFolder)

    try {
      await api.post('/admin/storage/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success("Archivo subido correctamente")
      
      // Actualizar todo
      fetchFiles()
      fetchStructure()
    } catch (err) {
      toast.error("Error al subir archivo")
    } finally {
        // Limpiar input
        e.target.value = "" 
        setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Breadcrumb helper
  const breadcrumbSegments = useMemo(() => {
    return currentPath ? currentPath.split('/') : []
  }, [currentPath])

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-blue-600" />
            Almacenamiento
          </h1>
          <p className="text-slate-500">Explorador de archivos corporativos.</p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="text-right hidden md:block">
                 <div className="text-sm font-medium text-slate-700">Espacio Usado</div>
                 <div className="text-xs text-slate-500">
                     {formatSize(stats?.used_bytes || 0)} / {formatSize(stats?.total_limit_bytes || 0)}
                 </div>
             </div>
             
             <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>

           <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm" disabled={uploading}>
                {uploading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "Subiendo..." : "Subir Archivo"}
              </Button>
           </label>
        </div>
      </div>

      {/* Toolbar & Breadcrumbs */}
      <div className="bg-white p-3 border rounded-xl shadow-sm flex flex-col gap-3 flex-shrink-0">
         <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {/* Botón atrás */}
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNavigateUp}
                disabled={!currentPath}
                className="mr-2 text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Breadcrumb Component */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    onClick={() => handleNavigate("")}
                    className={cn("cursor-pointer flex items-center gap-1", !currentPath ? "font-semibold text-slate-900" : "text-slate-500")}
                  >
                    <HardDrive className="w-4 h-4" />
                    Inicio
                  </BreadcrumbLink>
                </BreadcrumbItem>
                
                {breadcrumbSegments.map((segment, index) => {
                    // Reconstruct path up to this segment
                    const path = breadcrumbSegments.slice(0, index + 1).join('/')
                    const isLast = index === breadcrumbSegments.length - 1
                    
                    return (
                        <div key={path} className="flex items-center">
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage className="font-semibold text-slate-900">{segment}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink 
                                        onClick={() => handleNavigate(path)}
                                        className="cursor-pointer text-slate-500 hover:text-slate-900"
                                    >
                                        {segment}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </div>
                    )
                })}
              </BreadcrumbList>
            </Breadcrumb>
         </div>

         <div className="flex justify-between gap-3">
             <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder={`Buscar en ${currentPath ? currentPath.split('/').pop() : 'Inicio'}...`} 
                className="pl-10 h-9 border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex border rounded-lg overflow-hidden bg-slate-50 p-1 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-7 w-7", viewMode === 'grid' && "bg-white shadow-sm text-blue-600")}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-7 w-7", viewMode === 'list' && "bg-white shadow-sm text-blue-600")}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white border rounded-xl overflow-hidden shadow-sm relative min-h-[400px]">
          {loadingFiles || loadingFolders ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              </div>
          ) : null}

          {gridItems.length === 0 && !loadingFiles && !loadingFolders ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FolderOpen className="w-16 h-16 mb-4 text-slate-200" />
                <p className="text-lg font-medium text-slate-600">Carpeta vacía</p>
                <p className="text-sm">No hay elementos en esta ubicación.</p>
                <Button variant="link" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()} className="mt-2 text-blue-600">
                    Subir un archivo aquí
                </Button>
             </div>
          ) : (
            <div className="h-full overflow-y-auto p-4">
                 {viewMode === 'grid' ? (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                         {gridItems.map((item, idx) => (
                             <motion.div
                                key={item.type === 'folder' ? item.fullPath : item.data.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                className={cn(
                                    "group relative flex flex-col items-center p-4 rounded-xl border border-transparent hover:bg-blue-50/50 hover:border-blue-100 transition-all cursor-pointer",
                                    "active:scale-95 duration-100"
                                )}
                                onDoubleClick={() => {
                                    if (item.type === 'folder') handleNavigate(item.fullPath)
                                    else handleDownload(item.data.id, item.data.nombre)
                                }}
                             >
                                 <div className="w-16 h-16 mb-3 flex items-center justify-center transition-transform group-hover:-translate-y-1">
                                     {item.type === 'folder' ? (
                                         <Folder className="w-14 h-14 text-yellow-400 drop-shadow-sm fill-yellow-400/20" />
                                     ) : (
                                         <FileText className="w-12 h-12 text-blue-500 drop-shadow-sm" />
                                     )}
                                 </div>
                                 <span className="text-sm font-medium text-slate-700 text-center line-clamp-2 w-full break-words">
                                     {item.type === 'folder' ? item.name : item.data.nombre}
                                 </span>
                                 
                                 {/* Metadatos extra visibles al hover */}
                                 {item.type === 'file' && (
                                     <span className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         {formatSize(item.data.size_bytes)}
                                     </span>
                                 )}

                                 {/* Acciones flotantes */}
                                 {item.type === 'file' && (
                                     <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                                         <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-6 w-6 text-slate-600 hover:text-blue-600"
                                            onClick={(e) => { e.stopPropagation(); handleDownload(item.data.id, item.data.nombre) }}>
                                             <Download className="w-3.5 h-3.5" />
                                         </Button>
                                         <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-6 w-6 text-slate-600 hover:text-red-600"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.data.id) }}>
                                             <Trash2 className="w-3.5 h-3.5" />
                                         </Button>
                                     </div>
                                 )}
                             </motion.div>
                         ))}
                     </div>
                 ) : (
                   <div className="min-w-full inline-block align-middle">
                        <table className="min-w-full divide-y divide-slate-100">
                             <thead>
                                 <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                     <th className="px-4 py-3">Nombre</th>
                                     <th className="px-4 py-3">Tipo</th>
                                     <th className="px-4 py-3">Tamaño</th>
                                     <th className="px-4 py-3">Fecha</th>
                                     <th className="px-4 py-3 text-right">Acciones</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 bg-white">
                                 {gridItems.map((item) => (
                                     <tr 
                                        key={item.type === 'folder' ? item.fullPath : item.data.id}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                        onDoubleClick={() => {
                                            if (item.type === 'folder') handleNavigate(item.fullPath)
                                            else handleDownload(item.data.id, item.data.nombre)
                                        }}
                                     >
                                         <td className="px-4 py-3 whitespace-nowrap">
                                             <div className="flex items-center gap-3">
                                                 {item.type === 'folder' ? (
                                                     <Folder className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
                                                 ) : (
                                                     <FileText className="w-5 h-5 text-blue-500" />
                                                 )}
                                                 <span className="font-medium text-slate-700">
                                                     {item.type === 'folder' ? item.name : item.data.nombre}
                                                 </span>
                                             </div>
                                         </td>
                                         <td className="px-4 py-3 text-sm text-slate-500">
                                             {item.type === 'folder' ? 'Carpeta' : item.data.mime_type.split('/')[1] || 'Archivo'}
                                         </td>
                                         <td className="px-4 py-3 text-sm text-slate-500">
                                             {item.type === 'folder' ? '-' : formatSize(item.data.size_bytes)}
                                         </td>
                                         <td className="px-4 py-3 text-sm text-slate-500">
                                             {item.type === 'folder' ? '-' : format(new Date(item.data.created_at), "dd/MM/yyyy", { locale: es })}
                                         </td>
                                         <td className="px-4 py-3 text-right">
                                             {item.type === 'file' && (
                                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={(e) => { e.stopPropagation(); handleDownload(item.data.id, item.data.nombre) }}>
                                                         <Download className="w-4 h-4" />
                                                      </Button>
                                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(item.data.id) }}>
                                                         <Trash2 className="w-4 h-4" />
                                                      </Button>
                                                  </div>
                                             )}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                        </table>
                   </div>
                 )}
            </div>
          )}
      </div>
    </div>
  )
}
