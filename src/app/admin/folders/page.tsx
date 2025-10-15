'use client';

import { useState, useEffect } from 'react';
import { Folder, User, Plus, Search } from 'lucide-react';

interface Student {
  id: string;
  displayName: string;
  driveFolderId: string | null;
}

interface UnlinkedFolder {
  id: string;
  driveFolderId: string;
  folderName: string;
  subject: string;
  suggestedStudentId: string | null;
  createdAt: string;
}

export default function FoldersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [unlinkedFolders, setUnlinkedFolders] = useState<UnlinkedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/drive-data');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      setStudents(data.students || []);
      setUnlinkedFolders(data.unlinkedFolders || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkFolder = async (folderId: string, studentId: string) => {
    setLinking(folderId);
    try {
      const response = await fetch(`/api/admin/folders/${folderId}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Link failed');
      }
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Link error:', error);
      alert(`Failed to link folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLinking(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Folder className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading folders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Folder Management</h1>
        <p className="text-gray-600">Link Drive folders to students</p>
      </div>

      {/* Unlinked Folders */}
      {unlinkedFolders && unlinkedFolders.length > 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Folder className="h-5 w-5 text-red-600 mr-2" />
              Unlinked Folders ({unlinkedFolders.length})
            </h2>
            <p className="text-sm text-gray-600">Drive folders that need to be linked to students</p>
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
                  <div className="flex items-center space-x-3">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleLinkFolder(folder.driveFolderId, e.target.value);
                        }
                      }}
                      disabled={linking === folder.driveFolderId}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="">Select student...</option>
                      {students
                        .filter(s => !s.driveFolderId) // Only show students without folders
                        .map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.displayName}
                          </option>
                        ))}
                    </select>
                    {linking === folder.driveFolderId && (
                      <div className="text-xs text-gray-500">Linking...</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Unlinked Folders</h3>
          <p className="text-gray-600">All Drive folders are linked to students.</p>
        </div>
      )}

      {/* Students without folders */}
      {students.filter(s => !s.driveFolderId).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 text-gray-600 mr-2" />
              Students without folders ({students.filter(s => !s.driveFolderId).length})
            </h2>
            <p className="text-sm text-gray-600">Students who don't have a Drive folder linked yet</p>
          </div>
          
          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredStudents
              .filter(s => !s.driveFolderId)
              .map((student) => (
                <div key={student.id} className="px-6 py-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{student.displayName}</h3>
                      <p className="text-xs text-gray-500">No Drive folder linked</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      Waiting for folder...
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
