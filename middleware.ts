import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next|icons|static|manifest.json|sw.js|favicon.ico).*)"],
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  return response;
}
