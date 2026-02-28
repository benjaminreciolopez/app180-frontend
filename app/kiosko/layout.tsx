// app/kiosko/layout.tsx
// Layout mínimo para el kiosko - sin sidebar, sin auth, sin navegación

export const metadata = {
  title: "CONTENDO - Punto de Fichaje",
  description: "Terminal de fichaje de empleados",
};

export default function KioskoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {children}
    </div>
  );
}
