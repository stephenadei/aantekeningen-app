'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { generateWhatsAppLink, copyToClipboard } from '@/lib/whatsapp';

export default function NewStudentPage() {
  const [formData, setFormData] = useState({
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    student: any;
    pin: string;
  } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess({
          student: data.student,
          pin: data.pin,
        });
      } else {
        setError(data.error || 'Failed to create student');
      }
    } catch (err) {
      setError('Error creating student');
      console.error('Error creating student:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPin = async () => {
    if (success?.pin) {
      const success = await copyToClipboard(success.pin);
      if (success) {
        alert('PIN gekopieerd naar klembord!');
      } else {
        alert('Kon PIN niet kopiëren. Kopieer handmatig: ' + success.pin);
      }
    }
  };

  const handleWhatsAppShare = () => {
    if (success?.student && success?.pin) {
      const whatsappLink = generateWhatsAppLink(
        success.student.displayName,
        success.pin
      );
      window.open(whatsappLink, '_blank');
    }
  };

  if (success) {
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

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Check className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-lg font-medium text-green-800">
              Student succesvol aangemaakt!
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-green-800 mb-2">
                Studentgegevens:
              </h3>
              <p className="text-green-700">
                <strong>Naam:</strong> {success.student.displayName}
              </p>
              <p className="text-green-700">
                <strong>ID:</strong> {success.student.id}
              </p>
            </div>

            <div className="bg-white border border-green-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Toegangscode (PIN):
              </h3>
              <div className="flex items-center space-x-2">
                <code className="text-2xl font-mono font-bold text-gray-900 bg-gray-100 px-3 py-2 rounded">
                  {success.pin}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyPin}
                >
                  Kopiëren
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Bewaar deze PIN veilig. Deze wordt niet opnieuw getoond.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleWhatsAppShare}>
                📱 Deel via WhatsApp
              </Button>
              <Link href={`/admin/students/${success.student.id}`}>
                <Button variant="secondary">
                  Bekijk Student
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nieuwe Student</h1>
        <p className="mt-1 text-sm text-gray-500">
          Voeg een nieuwe student toe aan het systeem
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <Input
              label="Naam van de student"
              type="text"
              placeholder="Bijv. Emma, Lucas, Sophie..."
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
              helperText="De naam die de student gebruikt om in te loggen"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Wat gebeurt er na het aanmaken?
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Er wordt automatisch een 6-cijferige PIN gegenereerd</li>
              <li>• De PIN wordt veilig opgeslagen (gehasht)</li>
              <li>• Je kunt de PIN direct delen via WhatsApp</li>
              <li>• De student kan inloggen op het leerlingportaal</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Link href="/admin/students">
              <Button variant="secondary" type="button">
                Annuleren
              </Button>
            </Link>
            <Button type="submit" loading={loading}>
              <Users className="h-4 w-4 mr-2" />
              Student Aanmaken
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
