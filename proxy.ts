import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next|icons|static|manifest.json|sw.js|favicon.ico|api).*)"],
};

export default function proxy(req: NextRequest) {
  return NextResponse.next();
}
