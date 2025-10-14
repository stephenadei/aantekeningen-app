'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen, Edit3, Trash2, Plus, Loader2 } from 'lucide-react';

interface KeyConcept {
  id: string;
  term: string;
  explanation: string;
  example?: string;
  isAiGenerated: boolean;
}

interface FileInfo {
  id: string;
  name: string;
  title: string;
  viewUrl: string;
  downloadUrl: string;
  subject?: string;
  topic?: string;
  level?: string;
  schoolYear?: string;
  summary?: string;
}

interface FileDetailModalProps {
  file: FileInfo | null;
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FileDetailModal({ file, studentId, isOpen, onClose }: FileDetailModalProps) {
  const [concepts, setConcepts] = useState<KeyConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingConcept, setEditingConcept] = useState<string | null>(null);
  const [newConcept, setNewConcept] = useState({ term: '', explanation: '', example: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      loadConcepts();
    }
  }, [isOpen, file]);

  const loadConcepts = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}/files/${file.id}/concepts`);
      const data = await response.json();
      
      if (data.success) {
        setConcepts(data.concepts || []);
      }
    } catch (error) {
      console.error('Error loading concepts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConcept = async () => {
    if (!file || !newConcept.term || !newConcept.explanation) return;

    try {
      const response = await fetch(`/api/students/${studentId}/files/${file.id}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConcept)
      });

      const data = await response.json();
      if (data.success) {
        setConcepts([...concepts, data.concept]);
        setNewConcept({ term: '', explanation: '', example: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding concept:', error);
    }
  };

  const handleUpdateConcept = async (conceptId: string, updates: Partial<KeyConcept>) => {
    if (!file) return;

    try {
      const response = await fetch(`/api/students/${studentId}/files/${file.id}/concepts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, ...updates })
      });

      const data = await response.json();
      if (data.success) {
        setConcepts(concepts.map(c => c.id === conceptId ? data.concept : c));
        setEditingConcept(null);
      }
    } catch (error) {
      console.error('Error updating concept:', error);
    }
  };

  const handleDeleteConcept = async (conceptId: string) => {
    if (!file) return;

    try {
      const response = await fetch(`/api/students/${studentId}/files/${file.id}/concepts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId })
      });

      const data = await response.json();
      if (data.success) {
        setConcepts(concepts.filter(c => c.id !== conceptId));
      }
    } catch (error) {
      console.error('Error deleting concept:', error);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{file.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{file.name}</p>
              <div className="flex items-center space-x-4 mt-2">
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
            <button
              onClick={onClose}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-120px)]">
            {/* PDF Viewer */}
            <div className="flex-1 p-6">
              <div className="h-full border rounded-lg overflow-hidden">
                <iframe
                  src={file.viewUrl}
                  className="w-full h-full"
                  title={file.title}
                />
              </div>
            </div>

            {/* Concepts Panel */}
            <div className="w-96 border-l bg-gray-50 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Belangrijke Begrippen
                </h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add Concept Form */}
              {showAddForm && (
                <div className="bg-white p-4 rounded-lg border mb-4">
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
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Toevoegen
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : concepts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Geen begrippen beschikbaar</p>
                  <p className="text-sm">Voeg handmatig begrippen toe</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {concepts.map((concept) => (
                    <div key={concept.id} className="bg-white p-4 rounded-lg border">
                      {editingConcept === concept.id ? (
                        <EditConceptForm
                          concept={concept}
                          onSave={(updates) => handleUpdateConcept(concept.id, updates)}
                          onCancel={() => setEditingConcept(null)}
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
                            <div className="bg-gray-50 p-2 rounded text-sm">
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
}

function EditConceptForm({ concept, onSave, onCancel }: EditConceptFormProps) {
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
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Opslaan
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
