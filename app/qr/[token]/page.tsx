"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export default function QRTokenPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) { setError(true); return }

    const checkAndRedirect = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/qr-session/${token}/status`)
        const json = await res.json()

        if (json.status === "activated") {
          router.replace(`/factura-demo?s=${token}`)
        } else if (json.status === "pending") {
          router.replace(`/factura-demo?s=${token}`)
        } else if (json.status === "registered") {
          router.replace("/login")
        } else {
          // expired or not_found
          router.replace("/factura-demo")
        }
      } catch (e) {
        setError(true)
      }
    }

    checkAndRedirect()
  }, [token, router])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace no valido</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">
          Este enlace QR ha expirado o no es valido.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
        >
          Ir a Contendo
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 text-sm">Verificando enlace...</p>
      </div>
    </div>
  )
}
