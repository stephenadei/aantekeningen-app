'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AdminNavigation from '@/components/admin/AdminNavigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch by only checking pathname on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    // Don't redirect if we're already on the login page
    if (pathname === '/admin/login') {
      return;
    }

    if (!session) {
      router.push('/admin/login');
      return;
    }

    // Temporarily disable domain check for testing
    // if (!session.user?.email?.endsWith('@stephensprivelessen.nl')) {
    //   router.push('/admin/login?error=AccessDenied');
    //   return;
    // }
  }, [session, status, router, pathname, isClient]);

  // If we're on the login page, always show the children (login form)
  // Only check this on client side to prevent hydration mismatch
  if (isClient && pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={session.user!} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
