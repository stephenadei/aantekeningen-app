'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { authClient } from '@/lib/firebase-client';
import { onAuthStateChanged, User, type Auth } from 'firebase/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch by only checking pathname on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Firebase Auth state listener
  useEffect(() => {
    if (!authClient) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authClient as Auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return; // Still loading

    // Don't redirect if we're already on the login page
    if (pathname === '/admin/login') {
      return;
    }

    if (!user) {
      router.push('/admin/login');
      return;
    }

    // Check if user email is from allowed domain
    if (!user.email?.endsWith('@stephensprivelessen.nl')) {
      router.push('/admin/login?error=AccessDenied');
      return;
    }
  }, [user, loading, router, pathname, isClient]);

  // If we're on the login page, always show the children (login form)
  // Only check this on client side to prevent hydration mismatch
  if (isClient && pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={{
        name: user.displayName,
        email: user.email,
        image: user.photoURL,
      }} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
