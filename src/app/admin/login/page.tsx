'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { signIn, useSession } from 'next-auth/react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/admin');
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('[LOGIN] Attempting login for:', email);
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('[LOGIN] Result:', result);
      
      if (result?.error) {
        console.error('[LOGIN] Error:', result.error);
        setError(`Inloggen mislukt: ${result.error}`);
      } else if (result?.ok) {
        console.log('[LOGIN] Success, redirecting...');
        // Small delay to ensure session is set
        setTimeout(() => {
          router.push('/admin');
          router.refresh();
        }, 100);
      } else {
        console.warn('[LOGIN] Unexpected result:', result);
        setError('Onbekende fout bij inloggen. Check de console voor details.');
      }
    } catch (err: unknown) {
      console.error('[LOGIN] Exception:', err);
      setError(`Er is een fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
          <p className="mt-2 text-slate-700 dark:text-slate-300 font-medium">Laden...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
          Docentenportaal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Stephen&apos;s Privelessen
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-white/20 dark:border-slate-700/20">
          {/* Dark Mode Toggle */}
          <div className="flex justify-end mb-4">
            <DarkModeToggle />
          </div>

          {error && (
            <div className="mb-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
                Inloggen
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Voer je inloggegevens in om toegang te krijgen tot het docentenportaal.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="jouw@email.nl"
                  className="w-full h-11 px-4 text-slate-900 dark:text-white bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Wachtwoord
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full h-11 px-4 text-slate-900 dark:text-white bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Inloggen...
                </>
              ) : (
                'Inloggen'
              )}
            </button>

            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
              >
                Terug naar studentenportaal
              </Link>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p className="mb-2">
                <strong className="text-slate-700 dark:text-slate-300">Toegang:</strong> Alleen voor docenten van Stephen&apos;s Privelessen
              </p>
              <p>
                <strong className="text-slate-700 dark:text-slate-300">Beveiliging:</strong> Alle activiteiten worden gelogd voor audit doeleinden
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
