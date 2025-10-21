'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, ExternalLink, Calendar, User, Mail, Folder, FileText, Activity, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import type { Student, FileInfo } from '@/lib/interfaces';
import { createStudentName, createEmail, createDriveFolderId, createSubject } from '@/lib/types';

interface StudentDetail extends Omit<Student, 'lastLoginAt'> {
  files: FileInfo[];
  fileCount: number;
  lastActivity: string | null;
  lastLoginAt: string | null;
}

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentId = params.id;

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/students/${studentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch student');
      }
      
      const data = await response.json();
      setStudent(data.student);
    } catch (error) {
      console.error('Error fetching student:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch student');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: string, currentValue: string) => {
    setEditing(field);
    setEditValue(currentValue || '');
  };

  const handleSave = async (field: string) => {
    if (!student) return;

    setSaving(true);
    try {
      const updateData: Partial<Student> = {};
      
      switch (field) {
        case 'displayName':
          updateData.displayName = createStudentName(editValue.trim());
          break;
        case 'email':
          updateData.email = editValue.trim() ? createEmail(editValue.trim()) : undefined;
          break;
        case 'subject':
          updateData.subject = editValue ? createSubject(editValue) : undefined;
          break;
        case 'driveFolderId':
          updateData.driveFolderId = editValue.trim() ? createDriveFolderId(editValue.trim()) : undefined;
          break;
        case 'isActive':
          updateData.isActive = editValue === 'true';
          break;
      }

      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update student');
      }

      const result = await response.json();
      setStudent(result.student);
      setEditing(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Failed to update student. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setEditValue('');
  };

  const handleDelete = async () => {
    if (!student) return;

    if (!confirm(`Are you sure you want to delete student "${student.displayName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete student');
      }

      router.push('/admin/students');
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student. Please try again.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
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

  const subjectOptions = [
    { value: '', label: 'No subject' },
    { value: 'wiskunde-a', label: 'Wiskunde A' },
    { value: 'wiskunde-b', label: 'Wiskunde B' },
    { value: 'natuurkunde', label: 'Natuurkunde' },
    { value: 'scheikunde', label: 'Scheikunde' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'nederlands', label: 'Nederlands' },
    { value: 'engels', label: 'Engels' }
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <SkeletonLoader count={1} type="text" className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonLoader count={3} type="list-item" />
          </div>
          <div>
            <SkeletonLoader count={2} type="list-item" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Student not found</h3>
          <p className="text-gray-600 mb-4">{error || 'The requested student could not be found.'}</p>
          <Button onClick={() => router.push('/admin/students')}>
            Back to Students
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.displayName}</h1>
            <div className="flex items-center gap-2 mt-1">
              {student.subject && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubjectColor(student.subject)}`}>
                  {student.subject}
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                student.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {student.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(`/admin/students/${studentId}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="secondary"
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Display Name</label>
                  {editing === 'displayName' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave('displayName')}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-900">{student.displayName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('displayName', student.displayName)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  {editing === 'email' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="email"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave('email')}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-900">{student.email || 'No email'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('email', student.email || '')}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  {editing === 'subject' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        options={subjectOptions}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave('subject')}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-900">{student.subject || 'No subject'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('subject', student.subject || '')}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  {editing === 'isActive' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        options={[
                          { value: 'true', label: 'Active' },
                          { value: 'false', label: 'Inactive' }
                        ]}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave('isActive')}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('isActive', student.isActive.toString())}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Drive Folder Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Drive Integration
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Drive Folder ID</label>
                  {editing === 'driveFolderId' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Google Drive folder ID"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave('driveFolderId')}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-900 font-mono text-sm">
                        {student.driveFolderId || 'Not linked'}
                      </span>
                      {student.driveFolderId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://drive.google.com/drive/folders/${student.driveFolderId}`, '_blank')}
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('driveFolderId', student.driveFolderId || '')}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">File Count</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {student.fileCount} files
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Files */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Files
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/student/${studentId}`)}
              >
                View All Files
              </Button>
            </div>
            
            {student.files.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No files found</p>
            ) : (
              <div className="space-y-2">
                {student.files.slice(0, 5).map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{file.title}</div>
                      {file.subject && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSubjectColor(file.subject)}`}>
                          {file.subject}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatLastActivity(file.modifiedTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Last Activity</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatLastActivity(student.lastActivity)}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Last Login</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDate(student.lastLoginAt)}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDate(student.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => router.push(`/student/${studentId}`)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Student Portal
              </Button>
              
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => router.push(`/admin/students/${studentId}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Student
              </Button>
              
              {student.driveFolderId && (
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => window.open(`https://drive.google.com/drive/folders/${student.driveFolderId}`, '_blank')}
                >
                  <Folder className="w-4 h-4 mr-2" />
                  Open Drive Folder
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
