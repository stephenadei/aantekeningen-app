"use client";

import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface StudentPinChangerProps {
  studentId: string;
  studentName: string;
}

export default function StudentPinChanger({ studentId, studentName }: StudentPinChangerProps) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!currentPin || currentPin.length !== 6) {
      setError('Huidige PIN moet 6 cijfers zijn');
      return;
    }

    if (!newPin || newPin.length !== 6) {
      setError('Nieuwe PIN moet 6 cijfers zijn');
      return;
    }

    if (newPin !== confirmPin) {
      setError('Nieuwe PIN codes komen niet overeen');
      return;
    }

    if (currentPin === newPin) {
      setError('Nieuwe PIN moet anders zijn dan de huidige PIN');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/students/${studentId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPin,
          newPin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('PIN code succesvol gewijzigd!');
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        // Close after 2 seconds
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(null);
        }, 2000);
      } else {
        setError(data.error || 'Fout bij het wijzigen van PIN code');
      }
    } catch (err) {
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
      console.error('Error changing PIN:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-800/80 dark:bg-slate-800/80 hover:bg-blue-800 dark:hover:bg-slate-700 text-yellow-100 dark:text-yellow-300 rounded-lg transition-colors border border-yellow-300/30 dark:border-yellow-500/30 hover:border-yellow-300/50 dark:hover:border-yellow-500/50"
      >
        <Lock className="w-4 h-4" />
        <span>PIN wijzigen</span>
      </button>
    );
  }

  return (
    <div className="bg-blue-800/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-lg shadow-lg p-6 border border-blue-700/20 dark:border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-yellow-100 dark:text-yellow-300 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          PIN code wijzigen
        </h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setError(null);
            setSuccess(null);
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
          }}
          className="text-yellow-300 hover:text-yellow-100 transition-colors"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleChangePin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-yellow-200 dark:text-yellow-300 mb-2">
            Huidige PIN
          </label>
          <div className="relative">
            <input
              type={showCurrentPin ? 'text' : 'password'}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full pl-4 pr-12 py-3 border border-yellow-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 focus:border-transparent bg-yellow-100 dark:bg-slate-800 text-blue-900 dark:text-slate-100"
              maxLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPin(!showCurrentPin)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-slate-400 hover:text-blue-800 dark:hover:text-slate-200"
            >
              {showCurrentPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-yellow-200 dark:text-yellow-300 mb-2">
            Nieuwe PIN (6 cijfers)
          </label>
          <div className="relative">
            <input
              type={showNewPin ? 'text' : 'password'}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full pl-4 pr-12 py-3 border border-yellow-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 focus:border-transparent bg-yellow-100 dark:bg-slate-800 text-blue-900 dark:text-slate-100"
              maxLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPin(!showNewPin)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-slate-400 hover:text-blue-800 dark:hover:text-slate-200"
            >
              {showNewPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-yellow-200 dark:text-yellow-300 mb-2">
            Bevestig nieuwe PIN
          </label>
          <div className="relative">
            <input
              type={showConfirmPin ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full pl-4 pr-12 py-3 border border-yellow-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 focus:border-transparent bg-yellow-100 dark:bg-slate-800 text-blue-900 dark:text-slate-100"
              maxLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-slate-400 hover:text-blue-800 dark:hover:text-slate-200"
            >
              {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-blue-900 font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Wijzigen...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                PIN wijzigen
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError(null);
              setSuccess(null);
              setCurrentPin('');
              setNewPin('');
              setConfirmPin('');
            }}
            className="px-4 py-3 bg-blue-700/80 dark:bg-slate-700/80 text-yellow-100 dark:text-yellow-300 rounded-lg hover:bg-blue-700 dark:hover:bg-slate-700 transition-colors"
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  );
}

