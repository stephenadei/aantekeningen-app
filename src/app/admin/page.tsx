'use client';

import { useEffect, useState } from 'react';
import { Users, FileText, Shield, TrendingUp, Folder, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalStudents: number;
  totalNotes: number;
  recentActivity: number;
  activeStudents: number;
  unconfirmedFolders?: number;
  unlinkedFolders?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      name: 'Totaal Studenten',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: 'bg-blue-500',
      href: '/admin/students',
    },
    {
      name: 'Totaal Notities',
      value: stats?.totalNotes || 0,
      icon: FileText,
      color: 'bg-green-500',
      href: '/admin/notes',
    },
    {
      name: 'Actieve Studenten',
      value: stats?.activeStudents || 0,
      icon: TrendingUp,
      color: 'bg-purple-500',
      href: '/admin/students?filter=active',
    },
    {
      name: 'Recente Activiteit',
      value: stats?.recentActivity || 0,
      icon: Shield,
      color: 'bg-orange-500',
      href: '/admin/audit',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overzicht van je bijlesactiviteiten
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.name}
              href={card.href}
              className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <dt>
                <div className={`absolute ${card.color} rounded-md p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                  {card.name}
                </p>
              </dt>
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '...' : card.value}
                </p>
              </dd>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Snelle Acties
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/students/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Users className="h-4 w-4 mr-2" />
              Nieuwe Student
            </Link>
            <Link
              href="/admin/notes/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              Nieuwe Notitie
            </Link>
            <Link
              href="/admin/drive-data"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Folder className="h-4 w-4 mr-2" />
              Drive Data
              {stats?.unconfirmedFolders && stats.unconfirmedFolders > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {stats.unconfirmedFolders}
                </span>
              )}
            </Link>
            <Link
              href="/admin/audit"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Shield className="h-4 w-4 mr-2" />
              Audit Logs
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recente Activiteit
          </h3>
          <div className="mt-5">
            <div className="text-sm text-gray-500">
              <p>Hier worden recente activiteiten getoond...</p>
              <p className="mt-2">
                <Link
                  href="/admin/audit"
                  className="text-blue-600 hover:text-blue-500"
                >
                  Bekijk alle activiteiten →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Systeem Status
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Database
                </p>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Google Drive
                </p>
                <p className="text-sm text-gray-500">Verbonden</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
