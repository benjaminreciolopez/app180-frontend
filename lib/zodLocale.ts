import { z } from "zod";
// @ts-expect-error — el subpath "zod/v4/locales/es" existe pero sus tipos
// no se exponen por la firma genérica del package.json de Zod v4.3.
import es from "zod/v4/locales/es";

// Aplica el locale español a todos los issues de Zod que no tengan
// un mensaje custom. Se invoca una sola vez desde ToastProvider.
let configured = false;
export function configureZodSpanish() {
  if (configured) return;
  z.config(es());
  configured = true;
}
