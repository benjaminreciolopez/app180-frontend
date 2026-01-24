import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/login"],
};

export async function middleware(req: NextRequest) {
  try {
    const r = await fetch("https://app180-backend.onrender.com/system/status", {
      cache: "no-store",
    });

    const data = await r.json();

    // 👉 SOLO redirigir si NO está inicializado
    if (data.bootstrap === false) {
      return NextResponse.redirect(new URL("/setup", req.url));
    }
  } catch (e) {
    console.error("Middleware bootstrap error", e);
  }

  return NextResponse.next();
}
