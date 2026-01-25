import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas libres
  if (pathname.startsWith("/setup") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";
    const r = await fetch(`${apiUrl}/system/status`, {
      cache: "no-store",
    });

    const data = await r.json();

    // Sistema sin inicializar → forzar setup
    if (data.bootstrap === true) {
      if (!pathname.startsWith("/setup")) {
        return NextResponse.redirect(new URL("/setup", req.url));
      }
    }
  } catch (err) {
    console.error("Bootstrap middleware error:", err);
  }

  return NextResponse.next();
}
