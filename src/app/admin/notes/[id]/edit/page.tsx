'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RotateCcw, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

interface Note {
  id: string;
  studentId: string;
  contentMd: string;
  subject: string;
  level: string;
  topic: string;
  driveFileId: string | null;
  driveFileName: string | null;
  aiGenerated: boolean;
  aiConfirmed: boolean;
  manuallyEdited: boolean;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    displayName: string;
  };
}

interface KeyConcept {
  id: string;
  term: string;
  explanation: string;
  example: string | null;
  orderIndex: number;
  isAiGenerated: boolean;
}

const SUBJECTS = [
  'HBO/Universiteit',
  'Middelbareschool', 
  'MBO'
];

const LEVELS = [
  'Havo 4', 'Havo 5',
  'Vwo 4', 'Vwo 5', 'Vwo 6',
  'Vmbo-bk 3', 'Vmbo-bk 4',
  'Vmbo-gt 3', 'Vmbo-gt 4',
  'MBO 1', 'MBO 2', 'MBO 3', 'MBO 4',
  'HBO 1', 'HBO 2', 'HBO 3', 'HBO 4',
  'Universiteit 1', 'Universiteit 2', 'Universiteit 3'
];

export default function EditNotePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [keyConcepts, setKeyConcepts] = useState<KeyConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [newConcept, setNewConcept] = useState({ term: '', explanation: '', example: '' });

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    level: '',
    topic: '',
    contentMd: ''
  });

  const fetchNote = async () => {
    try {
      const response = await fetch(`/api/admin/notes/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch note');
      
      const data = await response.json();
      setNote(data);
      setFormData({
        subject: data.subject,
        level: data.level,
        topic: data.topic,
        contentMd: data.contentMd
      });
    } catch (error) {
      console.error('Error fetching note:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKeyConcepts = async () => {
    try {
      const response = await fetch(`/api/admin/notes/${params.id}/concepts`);
      if (response.ok) {
        const data = await response.json();
        setKeyConcepts(data);
      }
    } catch (error) {
      console.error('Error fetching key concepts:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/notes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          manuallyEdited: true,
          aiConfirmed: true
        })
      });
      
      if (!response.ok) throw new Error('Save failed');
      
      // Refresh data
      await fetchNote();
      alert('Note saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReanalyze = async () => {
    if (!confirm('This will re-analyze the note with AI and overwrite current data. Continue?')) {
      return;
    }
    
    setReanalyzing(true);
    try {
      const response = await fetch(`/api/admin/notes/${params.id}/reanalyze`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Re-analyze failed');
      
      // Refresh data
      await fetchNote();
      await fetchKeyConcepts();
      alert('Note re-analyzed successfully!');
    } catch (error) {
      console.error('Re-analyze error:', error);
      alert('Failed to re-analyze note. Please try again.');
    } finally {
      setReanalyzing(false);
    }
  };

  const addKeyConcept = async () => {
    if (!newConcept.term.trim() || !newConcept.explanation.trim()) {
      alert('Term and explanation are required');
      return;
    }

    try {
      const response = await fetch(`/api/admin/notes/${params.id}/concepts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newConcept,
          isAiGenerated: false
        })
      });
      
      if (!response.ok) throw new Error('Failed to add concept');
      
      setNewConcept({ term: '', explanation: '', example: '' });
      await fetchKeyConcepts();
    } catch (error) {
      console.error('Add concept error:', error);
      alert('Failed to add concept. Please try again.');
    }
  };

  const deleteKeyConcept = async (conceptId: string) => {
    if (!confirm('Delete this key concept?')) return;

    try {
      const response = await fetch(`/api/admin/notes/${params.id}/concepts/${conceptId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete concept');
      
      await fetchKeyConcepts();
    } catch (error) {
      console.error('Delete concept error:', error);
      alert('Failed to delete concept. Please try again.');
    }
  };

  useEffect(() => {
    fetchNote();
    fetchKeyConcepts();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Note Not Found</h3>
          <p className="text-gray-600 mb-4">The requested note could not be found.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Note</h1>
          <p className="text-gray-600">Student: {note.student.displayName}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${reanalyzing ? 'animate-spin' : ''}`} />
            {reanalyzing ? 'Re-analyzing...' : 'Re-analyze with AI'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            {note.aiGenerated ? (
              <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            )}
            <span className="text-sm font-medium">
              {note.aiGenerated ? 'AI Generated' : 'Manual Entry'}
            </span>
          </div>
          <div className="flex items-center">
            {note.aiConfirmed ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            )}
            <span className="text-sm font-medium">
              {note.aiConfirmed ? 'Confirmed' : 'Needs Review'}
            </span>
          </div>
          <div className="flex items-center">
            {note.manuallyEdited ? (
              <CheckCircle className="h-5 w-5 text-purple-500 mr-2" />
            ) : (
              <div className="h-5 w-5 bg-gray-300 rounded-full mr-2" />
            )}
            <span className="text-sm font-medium">
              {note.manuallyEdited ? 'Manually Edited' : 'Original'}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Note Details</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select subject...</option>
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select level...</option>
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Breuken, Logaritmen"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content (Markdown)
            </label>
            <textarea
              value={formData.contentMd}
              onChange={(e) => setFormData({ ...formData, contentMd: e.target.value })}
              rows={10}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Note content in Markdown format..."
            />
          </div>
        </div>
      </div>

      {/* Key Concepts */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Key Concepts</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Add new concept */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Concept</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={newConcept.term}
                onChange={(e) => setNewConcept({ ...newConcept, term: e.target.value })}
                placeholder="Term"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newConcept.explanation}
                onChange={(e) => setNewConcept({ ...newConcept, explanation: e.target.value })}
                placeholder="Explanation"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newConcept.example}
                onChange={(e) => setNewConcept({ ...newConcept, example: e.target.value })}
                placeholder="Example (optional)"
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={addKeyConcept}
              className="mt-3 inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Add Concept
            </button>
          </div>

          {/* Existing concepts */}
          <div className="space-y-3">
            {keyConcepts.map((concept) => (
              <div key={concept.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="font-medium text-gray-900">{concept.term}</h4>
                      {concept.isAiGenerated ? (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          AI
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{concept.explanation}</p>
                    {concept.example && (
                      <p className="text-xs text-gray-500 italic">Example: {concept.example}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteKeyConcept(concept.id)}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
