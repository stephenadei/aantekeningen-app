'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Folder, User, CheckCircle, AlertCircle } from 'lucide-react';
import type { DriveDataStudent, DriveDataUnlinkedFolder, DriveDataStatsDetailed } from '@/lib/interfaces';

export default function DriveDataPage() {
  const [students, setStudents] = useState<DriveDataStudent[]>([]);
  const [unlinkedFolders, setUnlinkedFolders] = useState<DriveDataUnlinkedFolder[]>([]);
  const [stats, setStats] = useState<DriveDataStatsDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/drive-data');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      setStudents(data.students || []);
      setUnlinkedFolders(data.unlinkedFolders || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching drive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/folders/sync', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Sync failed');
      
      // Refresh data after sync
      await fetchData();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirmLink = async (folderId: string) => {
    setActionLoading(folderId);
    try {
      const response = await fetch(`/api/admin/folders/${folderId}/confirm`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Confirm failed');
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Confirm error:', error);
      alert('Failed to confirm link. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectLink = async (folderId: string) => {
    setActionLoading(folderId);
    try {
      const response = await fetch(`/api/admin/folders/${folderId}/reject`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Reject failed');
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Reject error:', error);
      alert('Failed to reject link. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading drive data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Google Drive Data</h1>
          <p className="text-gray-600">Manage cached Drive folders and student links</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync from Drive'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Linked</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLinkedStudents}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.confirmedLinks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unconfirmed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unconfirmedLinks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Folder className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unlinked</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unlinkedFolders}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unconfirmed Links */}
      {students.filter(s => !s.folderConfirmed).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              Unconfirmed Links ({students.filter(s => !s.folderConfirmed).length})
            </h2>
            <p className="text-sm text-gray-600">Students with auto-linked folders that need confirmation</p>
          </div>
          <div className="divide-y divide-gray-200">
            {students.filter(s => !s.folderConfirmed).map((student) => (
              <div key={student.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-sm font-medium text-gray-900">{student.displayName}</h3>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {student.subject || 'Unknown'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      <Folder className="h-4 w-4 inline mr-1" />
                      {student.driveFolderName}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {student.notes.length} notes • Linked {new Date(student.folderLinkedAt!).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleConfirmLink(student.driveFolderId!)}
                      disabled={actionLoading === student.driveFolderId}
                      className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                    >
                      {actionLoading === student.driveFolderId ? '...' : 'Confirm'}
                    </button>
                    <button 
                      onClick={() => handleRejectLink(student.driveFolderId!)}
                      disabled={actionLoading === student.driveFolderId}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      {actionLoading === student.driveFolderId ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlinked Folders */}
      {unlinkedFolders && unlinkedFolders.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Folder className="h-5 w-5 text-red-600 mr-2" />
              Unlinked Folders ({unlinkedFolders.length})
            </h2>
            <p className="text-sm text-gray-600">Drive folders without student links</p>
          </div>
          <div className="divide-y divide-gray-200">
            {unlinkedFolders.map((folder) => (
              <div key={folder.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Folder className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-sm font-medium text-gray-900">{folder.folderName}</h3>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {folder.subject}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Found {new Date(folder.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200">
                      Link to Student
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Links */}
      {students.filter(s => s.folderConfirmed).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Confirmed Links ({students.filter(s => s.folderConfirmed).length})
            </h2>
            <p className="text-sm text-gray-600">Verified student-folder relationships</p>
          </div>
          <div className="divide-y divide-gray-200">
            {students.filter(s => s.folderConfirmed).map((student) => (
              <div key={student.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-sm font-medium text-gray-900">{student.displayName}</h3>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {student.subject || 'Unknown'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      <Folder className="h-4 w-4 inline mr-1" />
                      {student.driveFolderName}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {student.notes.length} notes • Confirmed {new Date(student.folderConfirmedAt!).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
                      View Notes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {students.length === 0 && unlinkedFolders.length === 0 && (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Drive Data Found</h3>
          <p className="text-gray-600 mb-4">Click &quot;Sync from Drive&quot; to fetch folder data from Google Drive.</p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Drive'}
          </button>
        </div>
      )}
    </div>
  );
}
