'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen, Edit3, Trash2, Plus, Loader2, Download, Share2, ExternalLink } from 'lucide-react';
import { useNativeShare } from '@/hooks/useNativeShare';
import Thumbnail from '@/components/ui/Thumbnail';
import type { 
  FileDetailModalKeyConcept, 
  FileDetailModalFileInfo, 
  FileDetailModalProps,
  EditConceptFormProps
} from '@/lib/interfaces';

export default function FileDetailModal({ file, studentId, isOpen, onClose }: FileDetailModalProps) {
  const [concepts, setConcepts] = useState<FileDetailModalKeyConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingConcept, setEditingConcept] = useState<string | null>(null);
  const [newConcept, setNewConcept] = useState({ term: '', explanation: '', example: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [page1Url, setPage1Url] = useState<string | null>(null);
  const [page2Url, setPage2Url] = useState<string | null>(null);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [showConceptsPanel, setShowConceptsPanel] = useState(false);
  
  const { isSupported: isNativeShareSupported, share: nativeShare, isSharing } = useNativeShare();

  useEffect(() => {
    if (isOpen && file) {
      loadConcepts();
      loadPagePreviews();
    }
  }, [isOpen, file]);

  const loadPagePreviews = async () => {
    if (!file || !file.id) return;
    
    setPagesLoading(true);
    try {
      // Get page 1 thumbnail (use existing thumbnail URL or generate)
      // For page 1, we can use the regular thumbnail endpoint
      const page1Thumbnail = file.thumbnailUrl || `/api/thumbnail/${encodeURIComponent(file.id)}?size=large`;
      setPage1Url(page1Thumbnail);
      
      // Get page 2 thumbnail using the page-specific endpoint
      const page2Thumbnail = `/api/thumbnail/${encodeURIComponent(file.id)}/page/2?size=large`;
      setPage2Url(page2Thumbnail);
      
      // Preload images
      if (page1Thumbnail) {
        const img1 = new Image();
        img1.src = page1Thumbnail;
      }
      if (page2Thumbnail) {
        const img2 = new Image();
        img2.src = page2Thumbnail;
      }
    } catch (error) {
      console.error('Error loading page previews:', error);
    } finally {
      setPagesLoading(false);
    }
  };

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

  const handleUpdateConcept = async (conceptId: string, updates: Partial<FileDetailModalKeyConcept>) => {
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

  const handleDownload = () => {
    if (file?.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (!file) return;

    const shareUrl = file.viewUrl || window.location.href;
    const shareTitle = file.title || 'PDF Document';
    const shareText = `Bekijk dit document: ${shareTitle}`;

    // Try native share first
    if (isNativeShareSupported) {
      const success = await nativeShare({
        title: shareTitle,
        text: shareText,
        url: shareUrl
      });
      
      if (success) {
        return;
      }
    }

    // Fallback to clipboard copy
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link gekopieerd naar klembord!');
      } else {
        // Fallback: show the link in a prompt
        const userConfirmed = confirm(
          `Shareable link:\n\n${shareUrl}\n\nKlik OK om de link te kopiëren.`
        );
        if (userConfirmed) {
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Link gekopieerd naar klembord!');
        }
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert(`Shareable link:\n\n${shareUrl}\n\nKopieer deze link handmatig.`);
    }
  };

  const handleOpenFull = () => {
    if (file?.viewUrl) {
      window.open(file.viewUrl, '_blank');
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
        <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{file.title}</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 font-medium">{file.name}</p>
              <div className="flex items-center space-x-3 mt-3">
                {file.subject && (
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                    {file.subject}
                  </span>
                )}
                {file.topic && (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium">
                    {file.topic}
                  </span>
                )}
                {file.level && (
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-medium">
                    {file.level}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {/* Action Buttons */}
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-blue-900 font-semibold rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
                title="Downloaden"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Downloaden</span>
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
                title="Delen"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delen</span>
              </button>
              <button
                onClick={handleOpenFull}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title="Volledige weergave"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Volledig</span>
              </button>
              <button
                onClick={onClose}
                className="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Sluiten"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-120px)]">
            {/* PDF Preview - First 2 Pages */}
            <div className={`${showConceptsPanel ? 'flex-1' : 'w-full'} p-6 overflow-y-auto bg-gray-50 dark:bg-slate-900 transition-all duration-300`}>
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Preview - Eerste 2 Pagina&apos;s
                  </h3>
                  <button
                    onClick={() => setShowConceptsPanel(!showConceptsPanel)}
                    className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    {showConceptsPanel ? 'Verberg' : 'Toon'} Begrippen
                  </button>
                </div>
                
                {pagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Preview laden...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Page 1 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                      <div className="bg-gray-100 dark:bg-slate-700 px-4 py-2 border-b border-gray-200 dark:border-slate-600">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pagina 1</span>
                      </div>
                      <div className="p-4">
                        {page1Url ? (
                          <img
                            src={page1Url}
                            alt="Pagina 1"
                            className="w-full h-auto rounded-lg shadow-sm"
                            onError={(e) => {
                              console.error('Failed to load page 1 preview');
                              (e.target as HTMLImageElement).src = '/api/placeholder/' + encodeURIComponent(file.id);
                            }}
                          />
                        ) : (
                          <div className="aspect-[8.5/11] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Page 2 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                      <div className="bg-gray-100 dark:bg-slate-700 px-4 py-2 border-b border-gray-200 dark:border-slate-600">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pagina 2</span>
                      </div>
                      <div className="p-4">
                        {page2Url ? (
                          <img
                            src={page2Url}
                            alt="Pagina 2"
                            className="w-full h-auto rounded-lg shadow-sm"
                            onError={(e) => {
                              console.error('Failed to load page 2 preview');
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = 
                                '<div class="aspect-[8.5/11] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"><p class="text-gray-500 dark:text-gray-400">Pagina 2 niet beschikbaar</p></div>';
                            }}
                          />
                        ) : (
                          <div className="aspect-[8.5/11] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View Full PDF Link */}
                    <div className="text-center pt-4">
                      <button
                        onClick={handleOpenFull}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Volledige PDF bekijken
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Concepts Panel - Collapsible */}
            {showConceptsPanel && (
              <div className="w-96 border-l bg-gray-50 dark:bg-slate-800 p-6 overflow-y-auto transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 flex items-center">
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
                  <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Nieuw Begrip Toevoegen</h4>
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
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
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
                            <h4 className="font-medium text-gray-900 dark:text-slate-100">{concept.term}</h4>
                            <div className="flex items-center space-x-1">
                              {concept.isAiGenerated && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  AI
                                </span>
                              )}
                              <button
                                onClick={() => setEditingConcept(concept.id)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-300"
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
                          <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">{concept.explanation}</p>
                          {concept.example && (
                            <div className="bg-gray-50 p-2 rounded text-sm">
                              <span className="font-medium text-gray-700">Voorbeeld:</span>
                              <p className="text-gray-600 dark:text-slate-300 mt-1">{concept.example}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
