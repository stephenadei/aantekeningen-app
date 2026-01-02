'use client';

import { useState } from 'react';
import { Key, Share2, Mail, MessageCircle, Copy, Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

interface StudentPinManagerProps {
  studentId: string;
  studentName: string;
  studentEmail?: string | null;
  studentPhone?: string | null;
  onPinUpdated?: () => void;
}

export default function StudentPinManager({
  studentId,
  studentName,
  studentEmail,
  studentPhone,
  onPinUpdated
}: StudentPinManagerProps) {
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<any>(null);

  const handleGetPinStatus = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/admin/students/${studentId}/pin`);
      const data = await response.json();
      
      if (data.success) {
        if (data.hasPin && data.pin) {
          setPin(data.pin); // Store PIN for display
          setSuccess(`Student heeft PIN code: ${data.pin}`);
        } else if (data.hasPin) {
          setSuccess('Student heeft een PIN code ingesteld (PIN niet beschikbaar)');
        } else {
          setError('Student heeft nog geen PIN code');
        }
      } else {
        setError(data.error || 'Failed to get PIN status');
      }
    } catch (err) {
      setError('Error checking PIN status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!newPin || newPin.length !== 6) {
      setError('PIN moet 6 cijfers zijn');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PIN codes komen niet overeen');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/students/${studentId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: newPin }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('PIN code succesvol bijgewerkt');
        setNewPin('');
        setConfirmPin('');
        setPin(newPin); // Store for sharing (only in memory, not persisted)
        onPinUpdated?.();
      } else {
        setError(data.error || 'Failed to update PIN');
      }
    } catch (err) {
      setError('Error updating PIN');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (!confirm('Weet je zeker dat je de PIN wilt resetten naar 000000?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/students/${studentId}/pin/reset`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`PIN gereset naar ${data.pin}`);
        setPin(data.pin); // Store for sharing (only in memory)
        onPinUpdated?.();
      } else {
        setError(data.error || 'Failed to reset PIN');
      }
    } catch (err) {
      setError('Error resetting PIN');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShareLogin = async (includePin: boolean = false) => {
    setSharing(true);
    setError(null);
    setSuccess(null);

    try {
      // Always use POST if we have a PIN to share, otherwise GET
      const method = includePin && pin ? 'POST' : 'GET';
      const body = includePin && pin ? JSON.stringify({ pin }) : undefined;
      const endpoint = `/api/admin/students/${studentId}/share-login`;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      const data = await response.json();

      if (data.success) {
        setShareInfo(data.shareInfo);
        setSuccess('Share informatie geladen');
      } else {
        setError(data.error || 'Failed to get share info');
      }
    } catch (err) {
      setError('Error getting share info');
      console.error(err);
    } finally {
      setSharing(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!shareInfo) {
      handleShareLogin(true).then(() => {
        // Retry after getting share info
        setTimeout(() => {
          if (shareInfo?.whatsappLink) {
            window.open(shareInfo.whatsappLink, '_blank');
          }
        }, 500);
      });
      return;
    }
    window.open(shareInfo.whatsappLink, '_blank');
  };

  const handleShareEmail = () => {
    if (!shareInfo) {
      handleShareLogin(true).then(() => {
        setTimeout(() => {
          if (shareInfo?.emailLink) {
            window.location.href = shareInfo.emailLink;
          } else if (studentEmail) {
            // Fallback: create mailto link
            const subject = encodeURIComponent(`Toegang tot je bijlesnotities - ${studentName}`);
            const body = encodeURIComponent(shareInfo?.emailBody || '');
            window.location.href = `mailto:${studentEmail}?subject=${subject}&body=${body}`;
          }
        }, 500);
      });
      return;
    }
    if (shareInfo.emailLink) {
      window.location.href = shareInfo.emailLink;
    } else if (studentEmail) {
      const subject = encodeURIComponent(shareInfo.emailSubject);
      const body = encodeURIComponent(shareInfo.emailBody);
      window.location.href = `mailto:${studentEmail}?subject=${subject}&body=${body}`;
    }
  };

  const handleCopyToClipboard = async () => {
    if (!shareInfo) {
      await handleShareLogin(true);
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const textToCopy = shareInfo?.clipboardText || `PIN voor ${studentName}: ${pin || '[PIN niet beschikbaar]'}`;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        setSuccess('Gekopieerd naar klembord!');
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setSuccess('Gekopieerd naar klembord!');
      }
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleNativeShare = async () => {
    if (!shareInfo) {
      await handleShareLogin(true);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!navigator.share) {
      setError('Native sharing wordt niet ondersteund in deze browser');
      return;
    }

    try {
      await navigator.share({
        title: `Toegang tot bijlesnotities - ${studentName}`,
        text: shareInfo?.clipboardText || `PIN voor ${studentName}`,
        url: shareInfo?.shareUrl || shareInfo?.studentPortalUrl,
      });
      setSuccess('Gedeeld via native share!');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to share');
        console.error(err);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Key className="h-5 w-5" />
          PIN Beheer
        </h3>
        <button
          onClick={handleGetPinStatus}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          Status ophalen
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Current PIN Display */}
      {pin && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Huidige PIN</h4>
              <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">{pin}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(pin);
                setSuccess('PIN gekopieerd naar klembord!');
                setTimeout(() => setSuccess(null), 2000);
              }}
              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Kopieer PIN"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Update PIN */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">PIN Bijwerken</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nieuwe PIN (6 cijfers)
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bevestig PIN
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleUpdatePin}
            disabled={loading || !newPin || newPin.length !== 6 || newPin !== confirmPin}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'PIN Bijwerken'}
          </Button>
          <Button
            onClick={handleResetPin}
            disabled={loading}
            variant="secondary"
          >
            Reset naar 000000
          </Button>
        </div>
      </div>

      {/* Share Login Info */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Login Info Delen
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Deel de login informatie met de leerling via verschillende kanalen
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={handleShareWhatsApp}
            disabled={sharing}
            className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
          >
            <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">WhatsApp</span>
          </button>
          <button
            onClick={handleShareEmail}
            disabled={sharing || !studentEmail}
            className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
          >
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Email</span>
          </button>
          <button
            onClick={handleCopyToClipboard}
            disabled={sharing}
            className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <Copy className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Kopiëren</span>
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              disabled={sharing}
              className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50"
            >
              <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Delen</span>
            </button>
          )}
        </div>
        {sharing && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Share informatie ophalen...</span>
          </div>
        )}
      </div>
    </div>
  );
}

