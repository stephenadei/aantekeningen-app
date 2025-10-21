'use client';

import { useState, useEffect } from 'react';
import { Search, Link, Unlink, RefreshCw, ExternalLink, User, Folder } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import type { FoldersListResponse, Student } from '@/lib/interfaces';

interface LinkModalState {
  isOpen: boolean;
  folderId?: string;
  folderName?: string;
  studentId?: string;
  studentName?: string;
  type: 'folder' | 'student';
}

export default function FoldersPage() {
  const [data, setData] = useState<FoldersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<LinkModalState>({ isOpen: false, type: 'folder' });
  const [linking, setLinking] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    unlinkedFolders: '',
    studentsWithoutFolders: ''
  });

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/folders');
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      
      const foldersData: FoldersListResponse = await response.json();
      setData(foldersData);
    } catch (error) {
      console.error('Error fetching folders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch folders');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkFolder = (folderId: string, folderName: string) => {
    setLinkModal({
      isOpen: true,
      folderId,
      folderName,
      type: 'folder'
    });
  };

  const handleLinkStudent = (studentId: string, studentName: string) => {
    setLinkModal({
      isOpen: true,
      studentId,
      studentName,
      type: 'student'
    });
  };

  const handleConfirmLink = async () => {
    if (!linkModal.folderId || !linkModal.studentId) return;

    setLinking(true);
    try {
      const response = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folderId: linkModal.folderId,
          studentId: linkModal.studentId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to link folder');
      }

      setLinkModal({ isOpen: false, type: 'folder' });
      fetchFolders(); // Refresh data
    } catch (error) {
      console.error('Error linking folder:', error);
      alert('Failed to link folder. Please try again.');
    } finally {
      setLinking(false);
    }
  };

  const getSubjectColor = (subject?: string) => {
    const colors: Record<string, string> = {
      'wiskunde-a': 'bg-blue-100 text-blue-800',
      'wiskunde-b': 'bg-blue-100 text-blue-800',
      'natuurkunde': 'bg-green-100 text-green-800',
      'scheikunde': 'bg-purple-100 text-purple-800',
      'biologie': 'bg-emerald-100 text-emerald-800',
      'nederlands': 'bg-red-100 text-red-800',
      'engels': 'bg-yellow-100 text-yellow-800'
    };
    return colors[subject || ''] || 'bg-gray-100 text-gray-800';
  };

  const filteredUnlinkedFolders = data?.unlinkedFolders.filter(folder =>
    folder.name.toLowerCase().includes(searchFilters.unlinkedFolders.toLowerCase())
  ) || [];

  const filteredStudentsWithoutFolders = data?.studentsWithoutFolders.filter(student =>
    student.displayName.toLowerCase().includes(searchFilters.studentsWithoutFolders.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <SkeletonLoader count={1} type="text" className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <SkeletonLoader count={3} type="list-item" />
          </div>
          <div>
            <SkeletonLoader count={3} type="list-item" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <Folder className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load folders</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchFolders}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drive Folders Management</h1>
          <p className="text-gray-600 mt-1">
            Link Google Drive folders to students
          </p>
        </div>
        <Button
          onClick={fetchFolders}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Link className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.linkedFolders.length}</div>
              <div className="text-sm text-gray-600">Linked Folders</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Unlink className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.unlinkedFolders.length}</div>
              <div className="text-sm text-gray-600">Unlinked Folders</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <User className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.studentsWithoutFolders.length}</div>
              <div className="text-sm text-gray-600">Students Without Folders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Unlinked Folders */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Unlinked Drive Folders ({data.unlinkedFolders.length})
              </h3>
            </div>
            <Input
              placeholder="Search folders..."
              value={searchFilters.unlinkedFolders}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, unlinkedFolders: e.target.value }))}
            />
          </div>
          
          <div className="p-4">
            {filteredUnlinkedFolders.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchFilters.unlinkedFolders ? 'No folders match your search' : 'No unlinked folders'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUnlinkedFolders.map((folder) => (
                  <div key={folder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{folder.name}</div>
                      {folder.subject && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSubjectColor(folder.subject)}`}>
                          {folder.subject}
                        </span>
                      )}
                      {folder.suggestedStudentId && (
                        <div className="text-sm text-blue-600 mt-1">
                          Suggested: {data.studentsWithoutFolders.find(s => s.id === folder.suggestedStudentId)?.displayName}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => window.open(`https://drive.google.com/drive/folders/${folder.id}`, '_blank')}
                        title="Open in Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleLinkFolder(folder.id, folder.name)}
                      >
                        <Link className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Students Without Folders */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Students Without Folders ({data.studentsWithoutFolders.length})
              </h3>
            </div>
            <Input
              placeholder="Search students..."
              value={searchFilters.studentsWithoutFolders}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, studentsWithoutFolders: e.target.value }))}
            />
          </div>
          
          <div className="p-4">
            {filteredStudentsWithoutFolders.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchFilters.studentsWithoutFolders ? 'No students match your search' : 'All students have folders'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudentsWithoutFolders.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{student.displayName}</div>
                      {student.email && (
                        <div className="text-sm text-gray-500">{student.email}</div>
                      )}
                      {student.subject && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSubjectColor(student.subject)}`}>
                          {student.subject}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLinkStudent(student.id, student.displayName)}
                    >
                      <Link className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link Modal */}
      {linkModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Link {linkModal.type === 'folder' ? 'Folder' : 'Student'}
            </h3>
            
            <div className="space-y-4">
              {linkModal.type === 'folder' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Folder
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{linkModal.folderName}</div>
                      <div className="text-sm text-gray-500">{linkModal.folderId}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link to Student
                    </label>
                    <Select
                      value=""
                      onChange={(e) => {
                        const student = data.studentsWithoutFolders.find(s => s.id === e.target.value);
                        setLinkModal(prev => ({
                          ...prev,
                          studentId: e.target.value,
                          studentName: student?.displayName
                        }));
                      }}
                      options={[
                        { value: '', label: 'Select a student' },
                        ...data.studentsWithoutFolders.map(student => ({
                          value: student.id,
                          label: student.displayName
                        }))
                      ]}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{linkModal.studentName}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link to Folder
                    </label>
                    <Select
                      value=""
                      onChange={(e) => {
                        const folder = data.unlinkedFolders.find(f => f.id === e.target.value);
                        setLinkModal(prev => ({
                          ...prev,
                          folderId: e.target.value,
                          folderName: folder?.name
                        }));
                      }}
                      options={[
                        { value: '', label: 'Select a folder' },
                        ...data.unlinkedFolders.map(folder => ({
                          value: folder.id,
                          label: folder.name
                        }))
                      ]}
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setLinkModal({ isOpen: false, type: 'folder' })}
                disabled={linking}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmLink}
                disabled={linking || !linkModal.folderId || !linkModal.studentId}
              >
                {linking ? 'Linking...' : 'Link'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
