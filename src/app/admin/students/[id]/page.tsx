'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  ArrowLeft, 
  Key, 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2,
  Calendar,
  FileText,
  Share2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { generateWhatsAppLink, copyToClipboard } from '@/lib/whatsapp';

interface Student {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  pinUpdatedAt: string;
  notes: Array<{
    id: string;
    contentMd: string;
    subject: string;
    level: string;
    topic: string;
    createdAt: string;
    updatedAt: string;
  }>;
  tags: Array<{
    key: string;
    value: string;
  }>;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [newPin, setNewPin] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/students/${studentId}`);
      const data = await response.json();

      if (data.success) {
        setStudent(data.student);
      } else {
        setError(data.error || 'Failed to fetch student');
      }
    } catch (err) {
      setError('Error loading student');
      console.error('Error fetching student:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePinReset = async () => {
    if (!confirm('Weet je zeker dat je de PIN wilt resetten? De oude PIN wordt ongeldig.')) {
      return;
    }

    try {
      setPinResetLoading(true);
      const response = await fetch(`/api/admin/students/${studentId}/pin-reset`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setNewPin(data.pin);
        // Refresh student data
        fetchStudent();
      } else {
        alert(`Fout bij resetten: ${data.error}`);
      }
    } catch (err) {
      alert('Er is een fout opgetreden bij het resetten van de PIN');
      console.error('Error resetting PIN:', err);
    } finally {
      setPinResetLoading(false);
    }
  };

  const handleCopyPin = async (pin: string) => {
    const success = await copyToClipboard(pin);
    if (success) {
      alert('PIN gekopieerd naar klembord!');
    } else {
      alert('Kon PIN niet kopiëren. Kopieer handmatig: ' + pin);
    }
  };

  const handleWhatsAppShare = (pin: string) => {
    if (student) {
      const whatsappLink = generateWhatsAppLink(student.displayName, pin);
      window.open(whatsappLink, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Link href="/admin/students">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar studenten
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Laden...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Link href="/admin/students">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar studenten
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Student niet gevonden'}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => router.push('/admin/students')}
          >
            Terug naar studenten
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/admin/students">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar studenten
            </Button>
          </Link>
        </div>
        <div className="flex space-x-2">
          <Link href={`/admin/students/${student.id}/edit`}>
            <Button variant="secondary">
              <Edit className="h-4 w-4 mr-2" />
              Bewerken
            </Button>
          </Link>
        </div>
      </div>

      {/* Student Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.displayName}</h1>
            <p className="text-gray-500">Student ID: {student.id}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Aangemaakt: {formatDate(student.createdAt)}
              </span>
              <span className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                {student.notes.length} notities
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PIN Management */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Toegangscode (PIN)</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePinReset}
            loading={pinResetLoading}
          >
            <Key className="h-4 w-4 mr-2" />
            PIN Resetten
          </Button>
        </div>

        {newPin && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              Nieuwe PIN gegenereerd:
            </h3>
            <div className="flex items-center space-x-2">
              <code className="text-2xl font-mono font-bold text-gray-900 bg-white px-3 py-2 rounded border">
                {newPin}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopyPin(newPin)}
              >
                Kopiëren
              </Button>
              <Button
                size="sm"
                onClick={() => handleWhatsAppShare(newPin)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>
            <p className="text-xs text-green-700 mt-2">
              ⚠️ Bewaar deze PIN veilig. Deze wordt niet opnieuw getoond.
            </p>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>Laatste PIN update: {formatDate(student.pinUpdatedAt)}</p>
          <p className="mt-1">
            De student kan inloggen op het leerlingportaal met hun naam en deze PIN.
          </p>
        </div>
      </div>

      {/* Student Tags */}
      {student.tags.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {student.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag.key}: {tag.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Notities</h2>
          <Link href={`/admin/notes/new?studentId=${student.id}`}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Notitie
            </Button>
          </Link>
        </div>

        {student.notes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Geen notities
            </h3>
            <p className="text-gray-500 mb-4">
              Voeg de eerste notitie toe voor {student.displayName}.
            </p>
            <Link href={`/admin/notes/new?studentId=${student.id}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Eerste Notitie Toevoegen
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {student.notes.map((note) => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
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
                    <p className="text-sm text-gray-600 mb-2">
                      {note.contentMd.length > 200
                        ? `${note.contentMd.substring(0, 200)}...`
                        : note.contentMd}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(note.createdAt)}
                    </p>
                  </div>
                  <div className="flex space-x-1 ml-4">
                    <Link href={`/admin/notes/${note.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) {
                          // TODO: Implement delete
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
