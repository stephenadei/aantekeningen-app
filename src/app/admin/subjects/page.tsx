'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit2, GripVertical, Loader } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

interface FormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, setDraggedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'BookOpen',
  });

  // Fetch subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subjects');
      const data = await res.json();
      if (data.success) {
        setSubjects(data.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `/api/admin/subjects/${editingId}` 
        : '/api/admin/subjects';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sortOrder: subjects.length + 1,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchSubjects();
      }
    } catch (error) {
      console.error('Error saving subject:', error);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this subject?')) {
      try {
        const res = await fetch(`/api/admin/subjects/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          fetchSubjects();
        }
      } catch (error) {
        console.error('Error deleting subject:', error);
      }
    }
  }

  function handleEdit(subject: Subject) {
    setEditingId(subject.id);
    setFormData({
      name: subject.name,
      description: subject.description,
      color: subject.color,
      icon: subject.icon,
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: 'BookOpen',
    });
    setIsModalOpen(false);
  }

  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Green', value: '#10B981' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Yellow', value: '#FBBF24' },
  ];

  const iconOptions = [
    'BookOpen',
    'BookMarked',
    'Code',
    'Target',
    'Users',
    'Zap',
    'Lightbulb',
    'Award',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-600 mt-1">Manage educational subjects and their topics</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-navy-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-navy-800"
        >
          <Plus className="h-5 w-5" />
          New Subject
        </button>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 text-navy-900 animate-spin" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No subjects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              draggable
              onDragStart={() => setDraggedId(subject.id)}
              className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition cursor-move border-2 border-transparent hover:border-navy-200"
              style={{ borderLeftColor: subject.color, borderLeftWidth: '4px' }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{subject.description}</p>
                </div>
                <GripVertical className="h-5 w-5 text-gray-400 ml-2" />
              </div>

              {/* Card Content */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="text-xs text-gray-600">Color</span>
                </div>
                <p className="text-xs text-gray-500">
                  Sort Order: <span className="font-semibold">{subject.sortOrder}</span>
                </p>
              </div>

              {/* Card Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(subject)}
                  className="flex-1 bg-navy-50 text-navy-900 px-3 py-2 rounded hover:bg-navy-100 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <Link
                  href={`/admin/subjects/${subject.id}/topics`}
                  className="flex-1 bg-yellow-50 text-yellow-900 px-3 py-2 rounded hover:bg-yellow-100 text-sm font-medium flex items-center justify-center gap-1"
                >
                  Topics
                </Link>
                <button
                  onClick={() => handleDelete(subject.id)}
                  className="bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Subject' : 'New Subject'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-900"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-900 resize-none"
                  rows={3}
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-full h-10 rounded-lg border-2 transition ${
                        formData.color === color.value
                          ? 'border-navy-900'
                          : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-900"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-navy-900 text-white px-4 py-2 rounded-lg hover:bg-navy-800 font-medium"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
