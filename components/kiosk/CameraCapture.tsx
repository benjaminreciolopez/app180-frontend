"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, RotateCcw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
  title?: string;
}

export default function CameraCapture({ onCapture, onCancel, title }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCaptured(null);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update video source when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror the image (front camera)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const base64 = dataUrl.split(",")[1];
    setCaptured(dataUrl);
    // Stop camera
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    onCapture(base64);
  };

  const handleRetake = () => {
    setCaptured(null);
    startCamera();
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <Camera className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Cámara no disponible</h2>
        <p className="text-white/50 text-center mb-6">{error}</p>
        <button
          onClick={onCancel}
          className="px-8 py-3 rounded-2xl bg-white/10 text-white font-medium text-lg"
        >
          Continuar sin foto
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white">
      <h2 className="text-xl font-semibold mb-4">
        {title || "Verificación de identidad"}
      </h2>
      <p className="text-white/50 mb-6 text-center">
        Sitúate frente a la cámara para verificar tu identidad
      </p>

      <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 w-full max-w-sm aspect-[3/4]">
        {!captured ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <img src={captured} alt="Captura" className="w-full h-full object-cover" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={onCancel}
          className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Cancelar"
        >
          <X className="h-6 w-6" />
        </button>

        {!captured ? (
          <button
            onClick={handleCapture}
            className="p-6 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30"
            title="Capturar"
          >
            <Camera className="h-8 w-8" />
          </button>
        ) : (
          <button
            onClick={handleRetake}
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Repetir"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}
