"use client"

import { useEffect } from "react"

export default function EmpleadoError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[EmpleadoError]", error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Error en tu panel</h2>
        <p className="text-muted-foreground">
          Ha ocurrido un error al cargar esta sección. Tus datos están seguros.
        </p>
        {error?.message && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg p-3 break-words">
            {error.message}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition"
          >
            Reintentar
          </button>
          <button
            onClick={() => (window.location.href = "/empleado/dashboard")}
            className="px-4 py-2 border border-border rounded-md hover:bg-accent transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
