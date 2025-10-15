'use client';

import { useState, useEffect } from 'react';
import { Users, FileText, TrendingUp, Activity, BarChart3, PieChart } from 'lucide-react';

interface StatsData {
  totalStudents: number;
  totalNotes: number;
  recentActivity: number;
  activeStudents: number;
  unconfirmedFolders: number;
  unlinkedFolders: number;
  subjectBreakdown: Array<{
    subject: string;
    count: number;
  }>;
  levelBreakdown: Array<{
    level: string;
    count: number;
  }>;
  recentNotes: Array<{
    id: string;
    topic: string;
    student: {
      displayName: string;
    };
    createdAt: string;
  }>;
  monthlyGrowth: Array<{
    month: string;
    students: number;
    notes: number;
  }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats/detailed');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Statistieken laden...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Kon statistieken niet laden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistieken</h1>
        <p className="text-gray-600">Overzicht van je bijlesactiviteiten en groei</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Totaal Studenten</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Totaal Notities</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalNotes}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Actieve Studenten</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recente Activiteit</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Drive Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-bold">!</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Onbevestigde Folders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unconfirmedFolders}</p>
              <p className="text-xs text-gray-500">Wachten op bevestiging</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">?</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ongekoppelde Folders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unlinkedFolders}</p>
              <p className="text-xs text-gray-500">Nog niet gekoppeld</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <PieChart className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Verdeling per Vak</h3>
          </div>
          <div className="space-y-3">
            {stats.subjectBreakdown.map((item, index) => {
              const percentage = stats.totalNotes > 0 ? (item.count / stats.totalNotes) * 100 : 0;
              return (
                <div key={item.subject} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ 
                        backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                      }}
                    ></div>
                    <span className="text-sm text-gray-700">{item.subject}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-2">{item.count}</span>
                    <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Verdeling per Niveau</h3>
          </div>
          <div className="space-y-3">
            {stats.levelBreakdown.slice(0, 8).map((item, index) => {
              const percentage = stats.totalNotes > 0 ? (item.count / stats.totalNotes) * 100 : 0;
              return (
                <div key={item.level} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ 
                        backgroundColor: `hsl(${120 + index * 30}, 70%, 50%)` 
                      }}
                    ></div>
                    <span className="text-sm text-gray-700">{item.level}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-2">{item.count}</span>
                    <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
            {stats.levelBreakdown.length > 8 && (
              <div className="text-xs text-gray-500 text-center pt-2">
                +{stats.levelBreakdown.length - 8} meer niveaus
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <Activity className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Recente Notities</h3>
        </div>
        <div className="space-y-3">
          {stats.recentNotes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Geen recente activiteit</p>
          ) : (
            stats.recentNotes.map((note) => (
              <div key={note.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{note.topic}</p>
                  <p className="text-xs text-gray-500">Student: {note.student.displayName}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Monthly Growth */}
      {stats.monthlyGrowth.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Maandelijkse Groei</h3>
          </div>
          <div className="space-y-3">
            {stats.monthlyGrowth.slice(-6).map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{month.month}</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm text-gray-600">{month.students}</span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-gray-600">{month.notes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
