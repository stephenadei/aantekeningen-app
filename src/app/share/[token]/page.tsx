'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ShareRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Geen share token opgegeven');
      setLoading(false);
      return;
    }

    // Fetch student info by share token
    const fetchStudent = async () => {
      try {
        const response = await fetch(`/api/share/${token}`);
        const data = await response.json();

        if (data.success && data.student) {
          // Redirect to student page using datalakePath or student ID
          if (data.student.datalakePath) {
            router.push(`/student/${encodeURIComponent(data.student.datalakePath)}`);
          } else if (data.student.id) {
            router.push(`/student/${data.student.id}`);
          } else {
            setError('Student informatie niet gevonden');
            setLoading(false);
          }
        } else {
          setError(data.error || 'Student niet gevonden');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching student by share token:', err);
        setError('Fout bij het ophalen van student informatie');
        setLoading(false);
      }
    };

    fetchStudent();
  }, [token, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">Link verwerken...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Link niet gevonden</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            Terug naar home
          </button>
        </div>
      </div>
    );
  }

  return null;
}



