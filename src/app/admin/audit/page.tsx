'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Filter, Calendar } from 'lucide-react';

interface LoginAudit {
  id: string;
  who: string;
  action: string;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
  student?: {
    id: string;
    displayName: string;
  };
}

interface AuditResponse {
  audits: LoginAudit[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_TYPES = [
  'login_ok',
  'login_fail', 
  'pin_reset',
  'pin_attempt',
  'impersonate'
];

const ACTION_LABELS = {
  login_ok: 'Succesvol ingelogd',
  login_fail: 'Login gefaald',
  pin_reset: 'PIN gereset',
  pin_attempt: 'PIN poging',
  impersonate: 'Impersonatie'
};

export default function AuditPage() {
  const [audits, setAudits] = useState<LoginAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchAudits = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(actionFilter && { action: actionFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });

      const response = await fetch(`/api/admin/audit?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data: AuditResponse = await response.json();
      setAudits(data.audits);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, actionFilter, dateFrom, dateTo]);

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    fetchAudits(1);
  }, [fetchAudits]);

  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchAudits(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        export: 'csv',
        ...(searchTerm && { search: searchTerm }),
        ...(actionFilter && { action: actionFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });

      const response = await fetch(`/api/admin/audit?${params}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export audit logs. Please try again.');
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'login_ok':
        return 'bg-green-100 text-green-800';
      case 'login_fail':
        return 'bg-red-100 text-red-800';
      case 'pin_reset':
        return 'bg-blue-100 text-blue-800';
      case 'pin_attempt':
        return 'bg-yellow-100 text-yellow-800';
      case 'impersonate':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatWho = (audit: LoginAudit) => {
    if (audit.teacher) {
      return `${audit.teacher.name} (${audit.teacher.email})`;
    }
    if (audit.student) {
      return `Student: ${audit.student.displayName}`;
    }
    return audit.who;
  };

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        handleSearch();
      } else {
        fetchAudits(currentPage);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, fetchAudits, handleSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Bekijk alle systeemactiviteiten en login pogingen</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zoeken
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Gebruiker, IP, actie..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actie
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle acties</option>
              {ACTION_TYPES.map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action as keyof typeof ACTION_LABELS]}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Van datum
            </label>
            <div className="relative">
              <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  handleFilterChange();
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tot datum
            </label>
            <div className="relative">
              <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  handleFilterChange();
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setActionFilter('');
                setDateFrom('');
                setDateTo('');
                setCurrentPage(1);
                fetchAudits(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 inline mr-2" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {loading ? 'Laden...' : `${total} audit entries gevonden`}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Pagina {currentPage} van {totalPages}
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Audit logs laden...</p>
          </div>
        ) : audits.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Geen audit logs gevonden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Adres
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tijdstip
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {audits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatWho(audit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(audit.action)}`}>
                        {ACTION_LABELS[audit.action as keyof typeof ACTION_LABELS] || audit.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {audit.ip || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {audit.userAgent || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(audit.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => fetchAudits(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Vorige
            </button>
            <button
              onClick={() => fetchAudits(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Volgende
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Toont <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> tot{' '}
                <span className="font-medium">
                  {Math.min(currentPage * 20, total)}
                </span>{' '}
                van <span className="font-medium">{total}</span> resultaten
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => fetchAudits(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Vorige
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => fetchAudits(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchAudits(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Volgende
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
