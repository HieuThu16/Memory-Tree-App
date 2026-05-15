import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/music/local")) {
    return NextResponse.next();
  }

  const isLoginRoute = pathname.startsWith("/login");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/friends") ||
    pathname.startsWith("/plans") ||
    pathname.startsWith("/countdown") ||
    pathname.startsWith("/music") ||
    pathname.startsWith("/location") ||
    pathname.startsWith("/personal");

  if (!isProtected && !isLoginRoute && !isAuthCallback) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (!user && isProtected && !isLoginRoute && !isAuthCallback) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);

    const redirect = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  if (user && isLoginRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";

    const redirect = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|api/music/local).*)",
  ],
};
