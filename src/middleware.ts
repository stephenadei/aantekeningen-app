import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { validateTeacherEmail } from '@/lib/security';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin routes require authentication (except login page)
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
      if (!token) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }

      // Check if user email is from allowed domain
      if (!token.email || !validateTeacherEmail(token.email)) {
        return NextResponse.redirect(new URL('/admin/login?error=AccessDenied', req.url));
      }
    }

    // Student portal routes (public, no auth required)
    if (pathname.startsWith('/leerling') || pathname.startsWith('/student')) {
      // Allow access to student portal and student pages
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
        
        // Admin login page is always accessible
        if (pathname === '/admin/login') {
          return true;
        }
        
        // Admin routes require token
        if (pathname.startsWith('/admin')) {
          return !!token;
        }
        
        // API admin routes require token
        if (pathname.startsWith('/api/admin')) {
          return !!token;
        }
        
        // Student routes don't require authentication
        if (pathname.startsWith('/student') || pathname.startsWith('/leerling')) {
          return true;
        }
        
        // Other routes don't require authentication
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/((?!login).)*',
    '/api/admin/:path*',
    '/leerling/:path*',
    '/student/:path*',
  ],
};
