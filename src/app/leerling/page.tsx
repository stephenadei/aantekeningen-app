'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Key, ArrowRight, AlertCircle, FileText, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { validatePinFormat } from '@/lib/security';
import { verifyPin } from '@/lib/security';
import { prisma } from '@/lib/prisma';

interface Student {
  id: string;
  displayName: string;
  notes: Array<{
    id: string;
    contentMd: string;
    subject: string;
    level: string;
    topic: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function LeerlingPortal() {
  const [formData, setFormData] = useState({
    displayName: '',
    pin: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const router = useRouter();

  // Helper functions for sessionStorage (client-side only)
  const setSessionStorage = (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
  };

  const removeSessionStorage = (key: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate PIN format
    if (!validatePinFormat(formData.pin)) {
      setError('PIN moet 6 cijfers zijn');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/leerling/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setStudent(data.student);
        // Store session info
        setSessionStorage('studentSession', JSON.stringify({
          studentId: data.student.id,
          displayName: data.student.displayName,
          loginTime: Date.now(),
        }));
      } else {
        setError(data.error || 'Inloggen mislukt');
      }
    } catch (err) {
      setError('Er is een fout opgetreden bij het inloggen');
      console.error('Error logging in:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeSessionStorage('studentSession');
    setStudent(null);
    setFormData({ displayName: '', pin: '' });
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Check for existing session on component mount
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const sessionData = typeof window !== 'undefined' ? sessionStorage.getItem('studentSession') : null;
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          // Check if session is still valid (30 minutes)
          if (Date.now() - session.loginTime < 30 * 60 * 1000) {
            // Session is still valid, fetch student data
            fetchStudentData(session.studentId);
          } else {
            // Session expired, clear it
            removeSessionStorage('studentSession');
          }
        } catch (err) {
          removeSessionStorage('studentSession');
        }
      }
    }
  }, []);

  const fetchStudentData = async (studentId: string) => {
    setLoadingStudent(true);
    try {
      const response = await fetch(`/api/leerling/student/${studentId}`);
      const data = await response.json();

      if (data.success) {
        setStudent(data.student);
      } else {
        removeSessionStorage('studentSession');
      }
    } catch (err) {
      removeSessionStorage('studentSession');
    } finally {
      setLoadingStudent(false);
    }
  };

  if (student) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Welkom, {student.displayName}!</h1>
                  <p className="text-blue-100">Je bijlesnotities</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-blue-100 hover:text-white transition-colors"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Totaal Notities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingStudent ? '...' : student.notes.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Laatste Notitie</p>
                  <p className="text-lg font-bold text-gray-900">
                    {loadingStudent 
                      ? '...' 
                      : student.notes.length > 0
                        ? formatDate(student.notes[0].createdAt)
                        : 'Geen notities'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Student</p>
                  <p className="text-lg font-bold text-gray-900">{student.displayName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Mijn Notities</h2>
            </div>

            {loadingStudent ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Notities laden...
                </h3>
                <p className="text-gray-500">
                  Even geduld, je notities worden opgehaald.
                </p>
              </div>
            ) : student.notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nog geen notities
                </h3>
                <p className="text-gray-500 mb-4">
                  Je docent heeft nog geen notities voor je toegevoegd.
                </p>
                <button
                  onClick={() => {
                    setLoadingStudent(true);
                    fetchStudentData(student.id);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Opnieuw laden
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {student.notes.map((note) => (
                  <div key={note.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {note.subject}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {note.level}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {note.topic}
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-gray-700">
                            {note.contentMd}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          {formatDate(note.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <User className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Leerlingportaal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Stephen&apos;s Privelessen
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Input
                label="Je naam"
                type="text"
                placeholder="Typ je naam zoals je docent die kent"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                required
              />
            </div>

            <div>
              <Input
                label="PIN (6 cijfers)"
                type="password"
                placeholder="000000"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                required
                maxLength={6}
              />
            </div>

            <div>
              <Button
                type="submit"
                loading={loading}
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Inloggen
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hulp nodig?</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Vraag je docent om de juiste naam en PIN.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
