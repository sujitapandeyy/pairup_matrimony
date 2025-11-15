// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin route protection
    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/user_dashboard", req.url));
    }

    // Redirect to interests if not completed
    if (
      path.startsWith("/user_dashboard") &&
      token?.interests_completed === false
    ) {
      return NextResponse.redirect(new URL("/interests", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Specify which routes to protect
export const config = {
  matcher: [
    "/user_dashboard/:path*",
    "/admin/:path*",
    "/interests/:path*",
    "/matches/:path*",
    "/profile/:path*",
    "/user/:path*",
  ],
};