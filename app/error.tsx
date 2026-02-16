"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-foreground">Algo ha ido mal</h1>
        <p className="text-muted-foreground">
          Ha ocurrido un error inesperado. Puedes intentar recargar la página.
        </p>
        {error?.message && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded p-3 break-words">
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
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 border border-border rounded-md hover:bg-accent transition"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
