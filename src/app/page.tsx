"use client";

import { useState, useEffect } from 'react';
import { Search, FileText, Calendar, User, ArrowLeft, Loader2 } from 'lucide-react';
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

export default function AantekeningenPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentOverview, setStudentOverview] = useState<StudentOverview | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Auto-search from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const studentParam = urlParams.get('student');
    if (studentParam) {
      setSearchQuery(studentParam);
      handleSearch(studentParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setStudents([]);
    setSelectedStudent(null);
    setFiles([]);

    try {
      const response = await fetch(`/api/students/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.students);
        if (data.students.length === 1) {
          // Auto-select if only one student found
          handleStudentSelect(data.students[0]);
        }
      } else {
        setError(data.message || 'Er is een fout opgetreden bij het zoeken');
      }
    } catch (err) {
      setError('Er is een fout opgetreden bij het zoeken');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudent(student);
    setLoading(true);
    setError(null);

    try {
      // Get overview and files in parallel
      const [overviewResponse, filesResponse] = await Promise.all([
        fetch(`/api/students/${student.id}/overview`),
        fetch(`/api/students/${student.id}/files`)
      ]);

      const [overviewData, filesData] = await Promise.all([
        overviewResponse.json(),
        filesResponse.json()
      ]);

      if (overviewData.success) {
        setStudentOverview(overviewData.overview);
      }

      if (filesData.success) {
        setFiles(filesData.files);
      } else {
        setError(filesData.message || 'Er is een fout opgetreden bij het laden van bestanden');
      }
    } catch (err) {
      setError('Er is een fout opgetreden bij het laden van studentgegevens');
      console.error('Student select error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setSelectedStudent(null);
    setStudentOverview(null);
    setFiles([]);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📚 Aantekeningen</h1>
              <p className="text-blue-100 mt-1">Stephen&apos;s Privelessen</p>
            </div>
            <Link 
              href="https://stephensprivelessen.nl" 
              className="text-blue-100 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar website
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!selectedStudent ? (
          /* Search Interface */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Zoek je aantekeningen</h2>
              
              <div className="flex gap-2 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Typ je naam om je aantekeningen te vinden..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={loading || !searchQuery.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Zoeken
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {students.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700">
                    {students.length} {students.length === 1 ? 'student gevonden' : 'studenten gevonden'}
                  </h3>
                  {students.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => handleStudentSelect(student)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-lg">{student.name}</h4>
                          <p className="text-gray-600">{student.subject}</p>
                        </div>
                        <div className="text-gray-400">
                          <User className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {students.length === 0 && !loading && searchQuery && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-2">Geen studenten gevonden</p>
                  <p className="text-sm text-gray-500">
                    Probeer een andere naam of controleer de spelling.
                  </p>
                </div>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 text-xl">🔒</div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Privacy</h4>
                  <p className="text-blue-700 text-sm">
                    Alleen je voornaam wordt gebruikt om je aantekeningen te vinden. 
                    Ouders kunnen de voornaam van hun kind gebruiken.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Student Files Interface */
          <div>
            {/* Student Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleBackToSearch}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Terug naar zoeken
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Lijst
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                  <p className="text-gray-600">{selectedStudent.subject}</p>
                  {studentOverview && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {studentOverview.fileCount} bestanden
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Laatste activiteit: {studentOverview.lastActivityDate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Bestanden laden...</span>
              </div>
            ) : files.length > 0 ? (
              /* Files Display */
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                      viewMode === 'list' ? 'flex items-center p-4' : 'p-4'
                    }`}
                  >
                    {viewMode === 'grid' ? (
                      <div>
                        <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="font-medium text-lg mb-2 line-clamp-2">{file.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">{file.name}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span>{formatDate(file.modifiedTime)}</span>
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={file.viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Bekijken
                          </a>
                          <a
                            href={file.downloadUrl}
                            className="flex-1 bg-gray-200 text-gray-700 text-center py-2 px-3 rounded text-sm hover:bg-gray-300 transition-colors"
                          >
                            Downloaden
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-lg">{file.title}</h3>
                            <p className="text-sm text-gray-500">{file.name}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                              <span>{formatDate(file.modifiedTime)}</span>
                              <span>{formatFileSize(file.size)}</span>
                              {file.subject && <span>{file.subject}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={file.viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Bekijken
                          </a>
                          <a
                            href={file.downloadUrl}
                            className="bg-gray-200 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-300 transition-colors"
                          >
                            Downloaden
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Geen bestanden gevonden</p>
                <p className="text-gray-500 text-sm mt-2">
                  Er zijn momenteel geen aantekeningen beschikbaar voor {selectedStudent.name}.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}