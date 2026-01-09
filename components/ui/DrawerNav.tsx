"use client";

import { ReactNode, useMemo, useState } from "react";

type Screen = {
  key: string;
  title: string;
  content: ReactNode;
  right?: ReactNode; // botón opcional a la derecha (ej: Guardar)
};

export default function DrawerNav({
  rootTitle,
  root,
  onClose,
}: {
  rootTitle: string;
  root: ReactNode;
  onClose: () => void;
}) {
  const [stack, setStack] = useState<Screen[]>([]);

  const current = useMemo(() => {
    if (stack.length === 0) {
      return { title: rootTitle, content: root, right: null as ReactNode };
    }
    return stack[stack.length - 1];
  }, [stack, root, rootTitle]);

  function push(screen: Screen) {
    setStack((prev) => [...prev, screen]);
  }

  function pop() {
    setStack((prev) => prev.slice(0, -1));
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header iOS */}
      <div className="h-14 flex items-center px-4 border-b border-black/5 bg-white">
        <button
          onClick={stack.length ? pop : onClose}
          className="text-[15px] font-medium text-blue-600"
        >
          {stack.length ? "Volver" : "Cerrar"}
        </button>

        <div className="flex-1 text-center">
          <div className="text-[15px] font-semibold text-gray-900 truncate">
            {current.title}
          </div>
        </div>

        <div className="min-w-[64px] flex justify-end">{current.right}</div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* content */ current.content}
      </div>

      {/* API expuesta vía context simple (prop drilling práctico) */}
      <DrawerNavActions push={push} />
    </div>
  );
}

/**
 * Esto permite que los componentes del contenido usen push() sin meter Context.
 * Solución simple: el root (EmpleadoDrawer) recibirá "push" por props.
 * Si prefieres Context luego, lo hacemos.
 */
function DrawerNavActions({ push }: { push: (s: any) => void }) {
  // No renderiza nada; solo existe para facilitar el patrón de composición si lo necesitas más tarde.
  return null;
}
