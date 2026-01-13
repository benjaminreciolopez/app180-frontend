"use client";

type Props = {
  url: string;
  filename?: string;
  onClose: () => void;
};

export default function ModalAdjuntoFullscreen({
  url,
  filename,
  onClose,
}: Props) {
  const isPdf = url.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between text-white">
        <div className="text-sm truncate">{filename || "Documento"}</div>
        <div className="flex gap-3">
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/10 text-sm"
          >
            Descargar
          </a>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto flex items-center justify-center">
        {isPdf ? (
          <iframe src={url} className="w-full h-full" title="PDF preview" />
        ) : (
          <img
            src={url}
            alt="Adjunto"
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>
    </div>
  );
}
