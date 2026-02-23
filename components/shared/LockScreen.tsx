"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Lock, Sparkles, Delete, Keyboard } from "lucide-react"

interface LockScreenProps {
  pinCode: string
  timeoutMinutes: number
  screensaverEnabled: boolean
  screensaverStyle: "clock" | "logo" | "minimal"
  enabled: boolean
  companyLogo?: string | null
}

export function LockScreen({ pinCode, timeoutMinutes, screensaverEnabled, screensaverStyle, enabled, companyLogo }: LockScreenProps) {
  const [isLocked, setIsLocked] = useState(false)
  const [enteredPin, setEnteredPin] = useState("")
  const [error, setError] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = useCallback(() => {
    if (!enabled || !pinCode) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsLocked(true)
      setEnteredPin("")
      setError(false)
    }, timeoutMinutes * 60 * 1000)
  }, [enabled, pinCode, timeoutMinutes])

  // Listen for user activity
  useEffect(() => {
    if (!enabled || !pinCode) return

    const events = ["mousedown", "keydown", "touchstart", "scroll"]
    const handleActivity = () => {
      if (!isLocked) resetTimer()
    }

    events.forEach(e => window.addEventListener(e, handleActivity))
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [enabled, pinCode, isLocked, resetTimer])

  // Clock update
  useEffect(() => {
    if (!isLocked) return
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [isLocked])

  // Physical keyboard support
  useEffect(() => {
    if (!isLocked) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Numbers 0-9
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        handleDigit(e.key)
      }
      // Backspace or Delete
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        handleDelete()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isLocked, enteredPin, pinCode]) // Include dependencies for handleDigit and handleDelete

  const handleDigit = (digit: string) => {
    if (enteredPin.length >= 6) return
    const newPin = enteredPin + digit
    setEnteredPin(newPin)
    setError(false)

    if (newPin.length === pinCode.length) {
      if (newPin === pinCode) {
        setIsLocked(false)
        setEnteredPin("")
        resetTimer()
      } else {
        setError(true)
        setTimeout(() => {
          setEnteredPin("")
          setError(false)
        }, 800)
      }
    }
  }

  const handleDelete = () => {
    setEnteredPin(prev => prev.slice(0, -1))
    setError(false)
  }

  if (!isLocked || !enabled) return null

  const timeStr = currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  const dateStr = currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col items-center justify-center select-none">
      {/* Screensaver content */}
      {screensaverEnabled && (
        <div className="mb-12 text-center">
          {(screensaverStyle === "clock" || screensaverStyle === "logo") && (
            <>
              <p className="text-7xl md:text-8xl font-thin text-white/90 tracking-wider">{timeStr}</p>
              <p className="text-lg text-white/50 mt-2 capitalize">{dateStr}</p>
            </>
          )}
          {screensaverStyle === "logo" && (
            <div className="flex flex-col items-center justify-center mt-8 gap-4">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="max-h-16 w-auto object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-400/60" />
                  <span className="text-blue-400/60 font-semibold tracking-wider text-sm">CONTENDO GESTIONES</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lock icon */}
      <div className="mb-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${error ? "bg-red-500/30" : "bg-white/10"}`}>
          <Lock className={`h-7 w-7 transition-colors ${error ? "text-red-400" : "text-white/70"}`} />
        </div>
      </div>

      {/* PIN dots */}
      <div className="flex gap-3 mb-8">
        {Array.from({ length: pinCode.length }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all ${
              error
                ? "bg-red-400 animate-pulse"
                : i < enteredPin.length
                  ? "bg-white scale-110"
                  : "bg-white/20"
            }`}
          />
        ))}
      </div>

      <p className={`text-sm mb-4 transition-colors ${error ? "text-red-400" : "text-white/40"}`}>
        {error ? "PIN incorrecto" : "Introduce tu PIN"}
      </p>

      {/* Toggle virtual keyboard button */}
      <button
        onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
        className="mb-6 px-4 py-2 rounded-lg flex items-center gap-2 text-white/60 hover:bg-white/10 active:bg-white/20 transition-colors text-sm"
      >
        <Keyboard className="h-4 w-4" />
        {showVirtualKeyboard ? "Ocultar teclado" : "Mostrar teclado"}
      </button>

      {/* Number pad (conditional) */}
      {showVirtualKeyboard && (
        <div className="grid grid-cols-3 gap-3 max-w-[240px]">
        {["1","2","3","4","5","6","7","8","9","","0","del"].map((key) => {
          if (key === "") return <div key="empty" />
          if (key === "del") {
            return (
              <button
                key="del"
                onClick={handleDelete}
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <Delete className="h-5 w-5" />
              </button>
            )
          }
          return (
            <button
              key={key}
              onClick={() => handleDigit(key)}
              className="w-[72px] h-[72px] rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors text-white text-2xl font-light"
            >
              {key}
            </button>
          )
        })}
        </div>
      )}
    </div>
  )
}
