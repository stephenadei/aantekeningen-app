import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { validateTeacherEmail } from '@/lib/security';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin routes require authentication
    if (pathname.startsWith('/admin')) {
      if (!token) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }

      // Check if user email is from allowed domain
      if (!token.email || !validateTeacherEmail(token.email)) {
        return NextResponse.redirect(new URL('/admin/login?error=AccessDenied', req.url));
      }
    }

    // Student portal routes (public, no auth required)
    if (pathname.startsWith('/leerling')) {
      // Allow access to student portal
      return NextResponse.next();
    }

    // API routes protection
    if (pathname.startsWith('/api/admin')) {
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!token.email || !validateTeacherEmail(token.email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Admin routes require token
        if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
          return !!token;
        }
        
        // API admin routes require token
        if (pathname.startsWith('/api/admin')) {
          return !!token;
        }
        
        // Other routes don't require authentication
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/leerling/:path*',
  ],
};
