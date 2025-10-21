'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Database, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import type { CacheStats, SyncStatus } from '@/lib/interfaces';

export default function CacheDashboard() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/sync');
      
      if (!response.ok) {
        throw new Error('Failed to fetch cache data');
      }

      const data = await response.json();
      setCacheStats(data.cacheStats);
      setSyncStatus(data.syncStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleFullSync = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'full-sync' }),
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      // Refresh data after starting sync
      setTimeout(fetchData, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Laden van cache statistieken...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cache Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Monitor Firestore cache performance en sync status
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Ververs
            </button>
            <button
              onClick={handleFullSync}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Database className="h-4 w-4 mr-2" />
              Start Sync
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Cache Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Totaal Cache Entries
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {cacheStats?.totalEntries || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Verlopen Entries
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {cacheStats?.expiredEntries || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Cache Hit Rate
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {cacheStats?.totalEntries ? 
                        Math.round(((cacheStats.totalEntries - (cacheStats.expiredEntries || 0)) / cacheStats.totalEntries) * 100) 
                        : 0}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <RefreshCw className={`h-6 w-6 ${syncStatus?.isRunning ? 'text-green-400 animate-spin' : 'text-gray-400'}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Sync Status
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {syncStatus?.isRunning ? 'Running' : 'Idle'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cache by Type */}
        {cacheStats?.byType && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Cache Entries per Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(cacheStats.byType).map(([type, count]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500 capitalize">
                      {type}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Sync Status
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Laatste Sync</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {syncStatus.lastSync ? 
                      new Date(syncStatus.lastSync).toLocaleString('nl-NL') : 
                      'Nog nooit gesynced'
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      syncStatus.isRunning 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {syncStatus.isRunning ? 'Actief' : 'Inactief'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Versie</dt>
                  <dd className="mt-1 text-sm text-gray-900">{syncStatus.version}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
