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

    if (data.bootstrap === true) {
      return NextResponse.redirect(new URL("/register", req.url));
    }
  } catch (e) {
    console.error("Middleware bootstrap error", e);
  }

  return NextResponse.next();
}
