"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Calendar, User, Share2, Download, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  subject: string;
  url: string;
}

interface StudentOverview {
  fileCount: number;
  lastActivity: string | null;
  lastActivityDate: string;
}

interface FileInfo {
  id: string;
  name: string;
  title: string;
  url: string;
  downloadUrl: string;
  viewUrl: string;
  thumbnailUrl: string;
  modifiedTime: string;
  size: number;
  subject?: string;
  topic?: string;
  level?: string;
  schoolYear?: string;
  keywords?: string[];
  summary?: string;
}

export default function StudentPage() {
  const params = useParams();
  const studentId = params.id as string;
  
  const [student, setStudent] = useState<Student | null>(null);
  const [studentOverview, setStudentOverview] = useState<StudentOverview | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareableUrl, setShareableUrl] = useState<string>('');

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load student info, overview, and files in parallel
      const [studentResponse, overviewResponse, filesResponse, shareResponse] = await Promise.all([
        fetch(`/api/students/search?q=${encodeURIComponent(studentId)}`),
        fetch(`/api/students/${studentId}/overview`),
        fetch(`/api/students/${studentId}/files`),
        fetch(`/api/students/${studentId}/share`)
      ]);

      if (!studentResponse.ok || !overviewResponse.ok || !filesResponse.ok) {
        throw new Error('Failed to load student data');
      }

      const studentData = await studentResponse.json();
      const overviewData = await overviewResponse.json();
      const filesData = await filesResponse.json();
      const shareData = await shareResponse.json();

      if (studentData.success && studentData.students.length > 0) {
        setStudent(studentData.students[0]);
      }

      if (overviewData.success) {
        setStudentOverview(overviewData.overview);
      }

      if (filesData.success) {
        setFiles(filesData.files);
      }

      if (shareData.success) {
        setShareableUrl(shareData.shareableUrl);
      }

    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const copyShareableLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      // You could add a toast notification here
      alert('Link gekopieerd naar klembord!');
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Kon link niet kopiëren');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Laden van studentgegevens...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
            <h1 className="text-xl font-semibold text-gray-900 mb-4">Student niet gevonden</h1>
            <p className="text-gray-600 mb-6">{error || 'De gevraagde student kon niet worden gevonden.'}</p>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar overzicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{student.name}</h1>
                <p className="text-sm text-gray-500">{student.subject}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={copyShareableLink}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Deel Link
              </button>
              <a
                href={student.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Drive
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Student</dt>
                    <dd className="text-lg font-medium text-gray-900">{student.name}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Aantal bestanden</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {studentOverview?.fileCount || 0}
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
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Laatste activiteit</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {studentOverview?.lastActivityDate || 'Onbekend'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Aantekeningen</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Alle bestanden van {student.name}
            </p>
          </div>
          
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Geen bestanden</h3>
              <p className="mt-1 text-sm text-gray-500">
                Er zijn nog geen aantekeningen beschikbaar voor deze student.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {files.map((file) => (
                <li key={file.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {file.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {file.name}
                          </p>
                          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{formatDate(file.modifiedTime)}</span>
                            <span>{formatFileSize(file.size)}</span>
                            {file.subject && <span>{file.subject}</span>}
                            {file.topic && <span>{file.topic}</span>}
                          </div>
                          {file.summary && (
                            <p className="mt-1 text-xs text-gray-600">{file.summary}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={file.viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Bekijk
                        </a>
                        <a
                          href={file.downloadUrl}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
