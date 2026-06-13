'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Admin error:', error);
  }, [error]);

  const isConfigError = 
    error.message?.includes('NEXTAUTH') ||
    error.message?.includes('NextAuth') ||
    error.message?.includes('SessionProvider') ||
    error.message?.includes('useSession');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isConfigError ? 'Configuratiefout' : 'Er is een fout opgetreden'}
        </h1>
        <p className="text-gray-600 mb-6">
          {isConfigError 
            ? 'NextAuth is niet correct geconfigureerd. Controleer de environment variabelen.'
            : error.message || 'Er is een onverwachte fout opgetreden in het admin panel.'}
        </p>

        {isConfigError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left text-sm">
            <p className="font-semibold text-yellow-800 mb-2">Controleer deze environment variabelen:</p>
            <ul className="list-disc list-inside text-yellow-700 space-y-1">
              <li><code className="bg-yellow-100 px-1 rounded">NEXTAUTH_URL</code> - Moet ingesteld zijn (https://stephensprive.app voor productie)</li>
              <li><code className="bg-yellow-100 px-1 rounded">NEXTAUTH_SECRET</code> - Moet ingesteld zijn</li>
              <li><code className="bg-yellow-100 px-1 rounded">DATABASE_URL</code> - Moet correct geconfigureerd zijn</li>
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            variant="primary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Probeer opnieuw
          </Button>
          <Link href="/admin/login">
            <Button variant="secondary" className="w-full sm:w-auto">
              <Home className="h-4 w-4 mr-2" />
              Naar login
            </Button>
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technische details (alleen in development)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-48">
              {error.stack || error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

