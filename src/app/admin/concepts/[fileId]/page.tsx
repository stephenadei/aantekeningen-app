'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Edit3, Trash2, Plus, Save, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface KeyConcept {
  id: string;
  term: string;
  explanation: string;
  example?: string;
  isAiGenerated: boolean;
  orderIndex: number;
}

interface FileInfo {
  id: string;
  name: string;
  title: string;
  viewUrl: string;
  subject?: string;
  topic?: string;
  level?: string;
  summary?: string;
}

export default function ConceptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.fileId as string;
  
  const [file, setFile] = useState<FileInfo | null>(null);
  const [concepts, setConcepts] = useState<KeyConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingConcept, setEditingConcept] = useState<string | null>(null);
  const [newConcept, setNewConcept] = useState({ term: '', explanation: '', example: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (fileId) {
      loadFileAndConcepts();
    }
  }, [fileId]);

  const loadFileAndConcepts = async () => {
    setLoading(true);
    try {
      // Load file info and concepts
      const [fileResponse, conceptsResponse] = await Promise.all([
        fetch(`/api/admin/files/${fileId}`), // This endpoint would need to be created
        fetch(`/api/admin/concepts/file/${fileId}`) // This endpoint would need to be created
      ]);

      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        setFile(fileData.file);
      }

      if (conceptsResponse.ok) {
        const conceptsData = await conceptsResponse.json();
        setConcepts(conceptsData.concepts || []);
      }
    } catch (error) {
      console.error('Error loading file and concepts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConcept = async () => {
    if (!newConcept.term || !newConcept.explanation) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveFileId: fileId,
          ...newConcept
        })
      });

      const data = await response.json();
      if (data.success) {
        setConcepts([...concepts, data.concept]);
        setNewConcept({ term: '', explanation: '', example: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding concept:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConcept = async (conceptId: string, updates: Partial<KeyConcept>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/concepts/${conceptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.success) {
        setConcepts(concepts.map(c => c.id === conceptId ? data.concept : c));
        setEditingConcept(null);
      }
    } catch (error) {
      console.error('Error updating concept:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConcept = async (conceptId: string) => {
    if (!confirm('Weet je zeker dat je dit begrip wilt verwijderen?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/concepts/${conceptId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setConcepts(concepts.filter(c => c.id !== conceptId));
      }
    } catch (error) {
      console.error('Error deleting concept:', error);
    } finally {
      setSaving(false);
    }
  };

  const regenerateWithAI = async () => {
    if (!confirm('Dit zal alle bestaande begrippen vervangen door AI-gegenereerde begrippen. Weet je het zeker?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/concepts/regenerate/${fileId}`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setConcepts(data.concepts);
      }
    } catch (error) {
      console.error('Error regenerating concepts:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Bestand niet gevonden</h1>
          <Link 
            href="/admin/concepts"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar overzicht
          </Link>
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
                href="/admin/concepts"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{file.title}</h1>
                <p className="text-sm text-gray-500">{file.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={regenerateWithAI}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regeneer met AI
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PDF Viewer */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">Document Preview</h2>
            </div>
            <div className="p-6">
              <div className="h-96 border rounded-lg overflow-hidden">
                <iframe
                  src={file.viewUrl}
                  className="w-full h-full"
                  title={file.title}
                />
              </div>
            </div>
          </div>

          {/* Concepts Panel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Belangrijke Begrippen
                </h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Toevoegen
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Add Concept Form */}
              {showAddForm && (
                <div className="bg-gray-50 p-4 rounded-lg border mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Nieuw Begrip Toevoegen</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Begrip"
                      value={newConcept.term}
                      onChange={(e) => setNewConcept({ ...newConcept, term: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      placeholder="Uitleg"
                      value={newConcept.explanation}
                      onChange={(e) => setNewConcept({ ...newConcept, explanation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                    <input
                      type="text"
                      placeholder="Voorbeeld (optioneel)"
                      value={newConcept.example}
                      onChange={(e) => setNewConcept({ ...newConcept, example: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddConcept}
                        disabled={saving}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Toevoegen...' : 'Toevoegen'}
                      </button>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Concepts List */}
              {concepts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Geen begrippen beschikbaar</p>
                  <p className="text-sm">Voeg handmatig begrippen toe of genereer met AI</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {concepts.map((concept) => (
                    <div key={concept.id} className="bg-gray-50 p-4 rounded-lg border">
                      {editingConcept === concept.id ? (
                        <EditConceptForm
                          concept={concept}
                          onSave={(updates) => handleUpdateConcept(concept.id, updates)}
                          onCancel={() => setEditingConcept(null)}
                          saving={saving}
                        />
                      ) : (
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{concept.term}</h4>
                            <div className="flex items-center space-x-1">
                              {concept.isAiGenerated && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  AI
                                </span>
                              )}
                              <button
                                onClick={() => setEditingConcept(concept.id)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteConcept(concept.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{concept.explanation}</p>
                          {concept.example && (
                            <div className="bg-white p-2 rounded text-sm">
                              <span className="font-medium text-gray-700">Voorbeeld:</span>
                              <p className="text-gray-600 mt-1">{concept.example}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditConceptFormProps {
  concept: KeyConcept;
  onSave: (updates: Partial<KeyConcept>) => void;
  onCancel: () => void;
  saving: boolean;
}

function EditConceptForm({ concept, onSave, onCancel, saving }: EditConceptFormProps) {
  const [formData, setFormData] = useState({
    term: concept.term,
    explanation: concept.explanation,
    example: concept.example || ''
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={formData.term}
        onChange={(e) => setFormData({ ...formData, term: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={formData.explanation}
        onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
      />
      <input
        type="text"
        value={formData.example}
        onChange={(e) => setFormData({ ...formData, example: e.target.value })}
        placeholder="Voorbeeld (optioneel)"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
