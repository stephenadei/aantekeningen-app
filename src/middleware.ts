import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Admin routes - let client-side handle authentication
  // The AdminLayout component already handles Firebase Auth state
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Check if Firebase token cookie exists (basic check)
    const firebaseToken = request.cookies.get('firebase-token')?.value;
    
    if (!firebaseToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // Let the client-side AdminLayout handle detailed auth verification
    return NextResponse.next();
  }

  // Student portal routes (public, no auth required)
  if (pathname.startsWith('/leerling') || pathname.startsWith('/student')) {
    // Allow access to student portal and student pages
    return NextResponse.next();
  }

  // API routes protection - basic cookie check only
  // Detailed verification happens in the API route handlers (Node.js runtime)
  if (pathname.startsWith('/api/admin')) {
    const firebaseToken = request.cookies.get('firebase-token')?.value;
    
    if (!firebaseToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Let the API route handler verify the token properly
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
