'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Edit2, Loader, ArrowLeft } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

interface FormData {
  name: string;
  description: string;
}

export default function TopicsPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
  });

  // Fetch topics on mount
  useEffect(() => {
    if (subjectId) {
      fetchTopics();
    }
  }, [subjectId]);

  async function fetchTopics() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/subjects/${subjectId}/topics`);
      const data = await res.json();
      if (data.success) {
        setTopics(data.topics);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(`/api/admin/subjects/${subjectId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          topicId: editingId,
          sortOrder: topics.length + 1,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchTopics();
      }
    } catch (error) {
      console.error('Error saving topic:', error);
    }
  }

  async function handleDelete(topicId: string) {
    if (confirm('Are you sure you want to delete this topic?')) {
      try {
        const res = await fetch(`/api/admin/subjects/${subjectId}/topics`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId }),
        });

        if (res.ok) {
          fetchTopics();
        }
      } catch (error) {
        console.error('Error deleting topic:', error);
      }
    }
  }

  function handleEdit(topic: Topic) {
    setEditingId(topic.id);
    setFormData({
      name: topic.name,
      description: topic.description,
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
    });
    setIsModalOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/subjects"
            className="text-navy-900 hover:text-navy-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Topics</h1>
            <p className="text-gray-600 mt-1">Manage topics for this subject</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-navy-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-navy-800"
        >
          <Plus className="h-5 w-5" />
          New Topic
        </button>
      </div>

      {/* Topics List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 text-navy-900 animate-spin" />
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No topics yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white rounded-lg p-4 shadow hover:shadow-md transition flex items-center justify-between"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{topic.name}</h3>
                <p className="text-sm text-gray-600">{topic.description}</p>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(topic)}
                  className="bg-navy-50 text-navy-900 px-3 py-2 rounded hover:bg-navy-100 flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(topic.id)}
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
              {editingId ? 'Edit Topic' : 'New Topic'}
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
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-900 resize-none"
                  rows={3}
                />
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
