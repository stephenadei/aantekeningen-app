'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Download, Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface SyncStatus {
  datalakeVersion: string | null;
  databaseVersion: string | null;
  inSync: boolean;
  lastSync: string | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function TaxonomyPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/taxonomy/sync');
      const data = await res.json();
      
      if (data.success) {
        setValidation(data.validation);
        // Extract sync status from validation or fetch separately
        setSyncStatus({
          datalakeVersion: null,
          databaseVersion: null,
          inSync: data.validation.valid,
          lastSync: null,
        });
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(direction: 'datalake-to-database' | 'database-to-datalake') {
    try {
      setSyncing(true);
      setMessage(null);
      
      const res = await fetch('/api/admin/taxonomy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync taxonomy' });
    } finally {
      setSyncing(false);
    }
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/admin/taxonomy/export');
      const data = await res.json();
      
      if (res.ok && data.success) {
        const blob = new Blob([JSON.stringify(data.taxonomy, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taxonomy-${data.taxonomy.version}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'Taxonomy exported successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export taxonomy' });
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const taxonomy = JSON.parse(text);

      const res = await fetch('/api/admin/taxonomy/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxonomy }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Taxonomy imported successfully' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Import failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import taxonomy' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Taxonomy Management</h1>
        <p className="text-gray-600 mt-1">Manage and sync taxonomy data between datalake and database</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Sync Status */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 text-navy-900 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sync Status</h2>
          
          {validation && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={validation.valid ? 'text-green-600' : 'text-red-600'}>
                  {validation.valid ? 'In Sync' : 'Out of Sync'}
                </span>
              </div>
              
              {validation.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-red-600 mb-2">Errors:</h3>
                  <ul className="list-disc list-inside text-sm text-red-600">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validation.warnings.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-yellow-600 mb-2">Warnings:</h3>
                  <ul className="list-disc list-inside text-sm text-yellow-600">
                    {validation.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sync Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => handleSync('datalake-to-database')}
              disabled={syncing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync Datalake → Database
            </button>
            
            <button
              onClick={() => handleSync('database-to-datalake')}
              disabled={syncing}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync Database → Datalake
            </button>
          </div>
        </div>
      )}

      {/* Export/Import */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Export / Import</h2>
        
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="bg-navy-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-navy-800"
          >
            <Download className="h-4 w-4" />
            Export Taxonomy
          </button>
          
          <label className="bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-yellow-700 cursor-pointer">
            <Upload className="h-4 w-4" />
            Import Taxonomy
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

