// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/login", "/"],
};

export async function middleware(req: NextRequest) {
  try {
    const r = await fetch("https://app180-backend.onrender.com/system/status", {
      cache: "no-store",
    });

    if (!r.ok) {
      return NextResponse.next();
    }

    const data = await r.json();

    const url = req.nextUrl.clone();

    // 🔴 No inicializado → forzar setup
    if (data.bootstrap === false) {
      if (!url.pathname.startsWith("/setup")) {
        url.pathname = "/setup";
        return NextResponse.redirect(url);
      }
    }

    // 🟢 Inicializado → no dejar entrar a setup
    if (data.bootstrap === true) {
      if (url.pathname.startsWith("/setup")) {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }
  } catch (e) {
    console.error("Middleware bootstrap error:", e);
  }

  return NextResponse.next();
}
