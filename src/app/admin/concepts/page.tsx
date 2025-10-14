'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Edit3, Trash2, Plus, Eye } from 'lucide-react';
import Link from 'next/link';

interface KeyConcept {
  id: string;
  term: string;
  explanation: string;
  example?: string;
  isAiGenerated: boolean;
  driveFileId: string;
  createdAt: string;
}

interface FileWithConcepts {
  id: string;
  name: string;
  title: string;
  subject?: string;
  topic?: string;
  level?: string;
  concepts: KeyConcept[];
}

export default function ConceptsPage() {
  const [files, setFiles] = useState<FileWithConcepts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  useEffect(() => {
    loadFilesWithConcepts();
  }, []);

  const loadFilesWithConcepts = async () => {
    setLoading(true);
    try {
      // This would need to be implemented as an API endpoint
      // For now, we'll show a placeholder
      setFiles([]);
    } catch (error) {
      console.error('Error loading files with concepts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchTerm || 
      file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.concepts.some(concept => 
        concept.term.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesSubject = !filterSubject || file.subject === filterSubject;
    const matchesLevel = !filterLevel || file.level === filterLevel;
    
    return matchesSearch && matchesSubject && matchesLevel;
  });

  const getUniqueSubjects = () => {
    const subjects = files.map(f => f.subject).filter(Boolean);
    return [...new Set(subjects)];
  };

  const getUniqueLevels = () => {
    const levels = files.map(f => f.level).filter(Boolean);
    return [...new Set(levels)];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Begrippen Beheer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Beheer belangrijke begrippen voor alle documenten
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zoeken
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Zoek in bestanden of begrippen..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vak
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle vakken</option>
              {getUniqueSubjects().map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Niveau
            </label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle niveaus</option>
              {getUniqueLevels().map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Bestanden met Begrippen
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {filteredFiles.length} van {files.length} bestanden
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Laden...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Geen bestanden gevonden</h3>
            <p className="mt-1 text-sm text-gray-500">
              Er zijn nog geen begrippen beschikbaar of geen bestanden voldoen aan de filters.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredFiles.map((file) => (
              <li key={file.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-blue-600 truncate">
                          {file.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {file.subject && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                              {file.subject}
                            </span>
                          )}
                          {file.topic && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              {file.topic}
                            </span>
                          )}
                          {file.level && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                              {file.level}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {file.name}
                      </p>
                      
                      {/* Concepts Preview */}
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {file.concepts.length} begrippen
                          </span>
                          {file.concepts.filter(c => c.isAiGenerated).length > 0 && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {file.concepts.filter(c => c.isAiGenerated).length} AI
                            </span>
                          )}
                        </div>
                        
                        {file.concepts.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {file.concepts.slice(0, 3).map((concept) => (
                              <span
                                key={concept.id}
                                className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                              >
                                {concept.term}
                              </span>
                            ))}
                            {file.concepts.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{file.concepts.length - 3} meer
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/admin/concepts/${file.id}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Bekijk
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
