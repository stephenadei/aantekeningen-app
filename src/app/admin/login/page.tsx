'use client';

import { signIn, getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Shield, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/admin');
      }
    };
    checkSession();

    // Check for error in URL params
    const errorParam = searchParams.get('error');
    if (errorParam === 'AccessDenied') {
      setError('Toegang geweigerd. Alleen docenten van stephensprivelessen.nl kunnen inloggen.');
    }
  }, [router, searchParams]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signIn('google', {
        callbackUrl: '/admin',
        redirect: false,
      });
      
      if (result?.error) {
        setError('Inloggen mislukt. Controleer je Google Workspace account.');
      } else if (result?.ok) {
        router.push('/admin');
      }
    } catch (err) {
      setError('Er is een fout opgetreden bij het inloggen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Docentenportaal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Stephen&apos;s Privelessen
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Inloggen met Google
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Alleen docenten met een Google Workspace account van{' '}
                <span className="font-medium">stephensprivelessen.nl</span> kunnen inloggen.
              </p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Inloggen...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Inloggen met Google
                </>
              )}
            </button>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Of</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <a
                href="/"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Terug naar studentenportaal
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="text-xs text-gray-500">
              <p className="mb-2">
                <strong>Toegang:</strong> Alleen voor docenten van Stephen&apos;s Privelessen
              </p>
              <p>
                <strong>Beveiliging:</strong> Alle activiteiten worden gelogd voor audit doeleinden
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
