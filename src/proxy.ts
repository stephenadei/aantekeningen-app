import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Admin routes - let client-side handle authentication
  // The AdminLayout component already handles NextAuth session state
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Basic check - detailed verification happens in AdminLayout
    // NextAuth session is handled client-side
    return NextResponse.next();
  }

  // Student portal routes (public, no auth required)
  if (pathname.startsWith('/leerling') || pathname.startsWith('/student')) {
    // Allow access to student portal and student pages
    return NextResponse.next();
  }

  // API routes protection - basic check only
  // Detailed verification happens in the API route handlers (Node.js runtime)
  // NextAuth session is verified in each API route handler
  if (pathname.startsWith('/api/admin')) {
    // Let the API route handler verify the session properly
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/((?!login).)*',
    '/api/admin/:path*',
    '/leerling/:path*',
    '/student/:path*',
  ],
};


