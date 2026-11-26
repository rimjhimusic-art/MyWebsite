import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "FINANCE_MANAGER",
  "CONTENT_MANAGER",
]);

function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "onetab-local-dev-secret-change-in-production-32chars-min";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const isAdminPublicRoute =
    pathname === "/admin/login" || pathname === "/admin/setup";
  const needsAuth =
    !isAdminPublicRoute &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"));

  if (!needsAuth) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const loginTarget = pathname.startsWith("/admin") ? "/admin/login" : "/login";
  const token = request.cookies.get("onetab_session")?.value;
  if (!token) {
    const loginUrl = new URL(loginTarget, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = typeof payload.role === "string" ? payload.role : "";
    if (pathname.startsWith("/admin") && !ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    const loginUrl = new URL(loginTarget, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
