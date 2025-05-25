import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FolderIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  UserIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { getVisits } from '../utils/api';
import { useToast } from '../components/ui/Toaster';

const ITEMS_PER_PAGE = 10;

const History = () => {
  const { addToast } = useToast();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [purposeFilter, setPurposeFilter] = useState('all');
  
  // Mijozlar guruhi uchun qo'shimcha state
  const [groupedClients, setGroupedClients] = useState({});
  const [expandedClientIds, setExpandedClientIds] = useState({});
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'flat'

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        setLoading(true);
        const data = await getVisits();
        
        // Debug uchun
        console.log('Raw visits data:', data);
        
        // Check if data is array and has items
        if (Array.isArray(data) && data.length > 0) {
          setVisits(data);
          setError(null);
          
          // Sort initially by entry time descending (newest first)
          const sorted = [...data].sort((a, b) => {
            return sortOrder === 'desc' 
              ? new Date(b.entry_time) - new Date(a.entry_time)
              : new Date(a.entry_time) - new Date(b.entry_time);
          });
          
          setFilteredVisits(sorted);
          setTotalPages(Math.ceil(sorted.length / ITEMS_PER_PAGE));
          
          // Mijozlar bo'yicha tashrif ma'lumotlarini guruhlash
          const groupedByClient = {};
          
          data.forEach(visit => {
            if (visit.client && visit.client_id) {
              const clientId = visit.client_id;
              if (!groupedByClient[clientId]) {
                groupedByClient[clientId] = {
                  client: visit.client,
                  visits: []
                };
              }
              groupedByClient[clientId].visits.push(visit);
            }
          });
          
          // Har bir mijoz uchun tashriflarni vaqt bo'yicha tartiblash
          Object.keys(groupedByClient).forEach(clientId => {
            groupedByClient[clientId].visits.sort((a, b) => {
              return sortOrder === 'desc' 
                ? new Date(b.entry_time) - new Date(a.entry_time)
                : new Date(a.entry_time) - new Date(b.entry_time);
            });
          });
          
          setGroupedClients(groupedByClient);
        } else {
          setVisits([]);
          setFilteredVisits([]);
          setTotalPages(0);
          setGroupedClients({});
        }
      } catch (err) {
        console.error('Error fetching visits:', err);
        setError('Failed to load visit history');
        setVisits([]);
        setFilteredVisits([]);
        setGroupedClients({});
        addToast('Failed to load visit history', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, [sortOrder]);

  useEffect(() => {
    // Apply filters
    let result = [...visits];
    
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      result = result.filter(visit => {
        const visitDate = new Date(visit.entry_time);
        return visitDate.toDateString() === filterDateObj.toDateString();
      });
    }
    
    // Apply sort
    result.sort((a, b) => {
      return sortOrder === 'desc' 
        ? new Date(b.entry_time) - new Date(a.entry_time)
        : new Date(a.entry_time) - new Date(b.entry_time);
    });
    
    setFilteredVisits(result);
    setTotalPages(Math.ceil(result.length / ITEMS_PER_PAGE));
    setCurrentPage(1); // Reset to first page when filter changes
  }, [filterDate, visits, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const clearFilters = () => {
    setFilterDate('');
    setPurposeFilter('all');
    setFilter('all');
  };

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredVisits.slice(startIndex, endIndex);
  };

  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return { date: 'Invalid date', time: 'Invalid time' };
      }
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    } catch (e) {
      console.error("Error formatting date:", e);
      return { date: 'Error', time: 'Error' };
    }
  };

  const formatDuration = (entryTime, exitTime) => {
    try {
      if (!exitTime) return 'Still active';
      
      const entry = new Date(entryTime);
      const exit = new Date(exitTime);
      
      if (isNaN(entry.getTime()) || isNaN(exit.getTime())) {
        return 'Invalid duration';
      }
      
      const durationMs = exit - entry;
      
      if (durationMs < 0) {
        return 'Invalid duration';
      }
      
      const minutes = Math.floor(durationMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (hours === 0) {
        return `${minutes} min`;
      }
      
      return `${hours} hr ${remainingMinutes} min`;
    } catch (e) {
      console.error("Error calculating duration:", e);
      return "Error";
    }
  };

  const formatPurpose = (purpose) => {
    if (!purpose) return 'Not specified';
    
    // Purpose ni chiroyli ko'rsatish uchun formatlash
    const purposeColors = {
      'View new cars': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Access services': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Schedule test drive': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Manage documents': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Get information': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'Purchase car': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    
    const colorClass = purposeColors[purpose] || 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    
    return { text: purpose, colorClass };
  };

  const filteredVisitsPerPage = () => {
    try {
      if (!Array.isArray(filteredVisits)) return [];
      
      if (filter === 'all') return filteredVisits;
      
      const now = new Date();
      if (isNaN(now.getTime())) return filteredVisits;
      
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      return filteredVisits.filter(visit => {
        try {
          const visitDate = new Date(visit.entry_time);
          if (isNaN(visitDate.getTime())) return false;
          
          if (filter === 'today') return visitDate >= startOfDay;
          if (filter === 'week') return visitDate >= startOfWeek;
          if (filter === 'month') return visitDate >= startOfMonth;
          return true;
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.error("Error filtering visits:", e);
      return [];
    }
  };

  const paginatedVisits = () => {
    try {
      const filtered = filteredVisitsPerPage();
      if (!Array.isArray(filtered)) return [];
      
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    } catch (e) {
      console.error("Error paginating visits:", e);
      return [];
    }
  };

  const totalPagesPerFilter = Math.ceil(filteredVisitsPerPage().length / ITEMS_PER_PAGE);

  const getPurposeStats = () => {
    const stats = {};
    filteredVisits.forEach(visit => {
      const purpose = visit.purpose || 'Not specified';
      stats[purpose] = (stats[purpose] || 0) + 1;
    });
    return stats;
  };

  const getDurationStats = () => {
    const stats = {
      'Less than 15 min': 0,
      '15-30 min': 0,
      '30-60 min': 0,
      'Over 1 hour': 0
    };
    
    filteredVisits.forEach(visit => {
      if (visit.entry_time && visit.exit_time) {
        const entry = new Date(visit.entry_time);
        const exit = new Date(visit.exit_time);
        const durationMs = exit - entry;
        const minutes = Math.floor(durationMs / (1000 * 60));
        
        if (minutes < 15) {
          stats['Less than 15 min']++;
        } else if (minutes < 30) {
          stats['15-30 min']++;
        } else if (minutes < 60) {
          stats['30-60 min']++;
        } else {
          stats['Over 1 hour']++;
        }
      }
    });
    
    return stats;
  };

  // Mijoz papkasini ochish/yopish
  const toggleClientFolder = (clientId) => {
    setExpandedClientIds(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  // Ko'rinish rejimini almashtirish
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grouped' ? 'flat' : 'grouped');
  };

  // Mijozlarni sahifalash
  const paginatedClients = () => {
    try {
      const clientIds = Object.keys(groupedClients);
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return clientIds.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    } catch (e) {
      console.error("Error paginating clients:", e);
      return [];
    }
  };

  const totalClientsPages = Math.ceil(Object.keys(groupedClients).length / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visit History</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={toggleViewMode}
          >
            <span>{viewMode === 'grouped' ? 'Show All Visits' : 'Group by Client'}</span>
          </Button>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2"
          onClick={() => alert('Export functionality would go here')}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          <span>Export</span>
        </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800"
                />
              </div>
            </div>
            <div className="flex items-end space-x-2 mt-4 md:mt-0">
              <Button 
                variant="outline" 
                onClick={toggleSortOrder}
                className="flex items-center space-x-2"
              >
                <ArrowsUpDownIcon className="w-5 h-5" />
                <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
              </Button>
              {(filterDate) && (
                <Button 
                  variant="secondary" 
                  onClick={clearFilters}
                  className="flex items-center space-x-2"
                >
                  <span>Clear Filters</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Filters */}
      <div className="flex space-x-2">
        <Button 
          variant={filter === 'all' ? 'secondary' : 'outline'} 
          size="sm"
          onClick={() => { setFilter('all'); setCurrentPage(1); }}
        >
          All Time
        </Button>
        <Button 
          variant={filter === 'today' ? 'secondary' : 'outline'} 
          size="sm"
          onClick={() => { setFilter('today'); setCurrentPage(1); }}
        >
          Today
        </Button>
        <Button 
          variant={filter === 'week' ? 'secondary' : 'outline'} 
          size="sm"
          onClick={() => { setFilter('week'); setCurrentPage(1); }}
        >
          This Week
        </Button>
        <Button 
          variant={filter === 'month' ? 'secondary' : 'outline'} 
          size="sm"
          onClick={() => { setFilter('month'); setCurrentPage(1); }}
        >
          This Month
        </Button>
      </div>

      {/* Visits Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClockIcon className="w-6 h-6 mr-2" />
            {viewMode === 'grouped' ? 'Clients Visit History' : 'Visit Records'}
          </CardTitle>
          <CardDescription>
            {viewMode === 'grouped' 
              ? `Showing ${Object.keys(groupedClients).length} clients` 
              : `Showing ${filteredVisitsPerPage().length} visit records`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === 'grouped' ? (
            // Mijozlar bo'yicha guruhlangan ko'rinish
            Object.keys(groupedClients).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No clients found</p>
                {filterDate && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Try changing your filter settings
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedClients().map(clientId => {
                  const clientData = groupedClients[clientId];
                  const isExpanded = expandedClientIds[clientId];
                  const totalVisits = clientData.visits.length;
                  const lastVisit = clientData.visits[0]; // Eng so'nggi tashrif
                  const clientName = `${clientData.client.first_name} ${clientData.client.last_name}`;
                  
                  return (
                    <div key={clientId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Mijoz papka sarlavhasi */}
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                        onClick={() => toggleClientFolder(clientId)}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <FolderIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {clientName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {totalVisits} visits • Last visit: {formatDateTime(lastVisit.entry_time).date}
                            </div>
                          </div>
                        </div>
                        <div>
                          {isExpanded ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Mijozning tashriflari */}
                      {isExpanded && (
                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entry</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exit</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purpose</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                {clientData.visits.map(visit => {
                                  const entryTime = formatDateTime(visit.entry_time);
                                  const exitTime = visit.exit_time ? formatDateTime(visit.exit_time) : null;
                                  const duration = formatDuration(visit.entry_time, visit.exit_time);
                                  const purpose = formatPurpose(visit.purpose);
                                  
                                  return (
                                    <tr key={visit.id}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">{entryTime.time}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{entryTime.date}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {exitTime ? (
                                          <>
                                            <div className="text-sm text-gray-900 dark:text-white">{exitTime.time}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{exitTime.date}</div>
                                          </>
                                        ) : (
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            Active
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                          !visit.exit_time 
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        }`}>
                                          {duration}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${purpose.colorClass}`}>
                                          {purpose.text}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Oddiy tashrif ro'yxati ko'rinishi (o'zgarishsiz qoladi)
            filteredVisitsPerPage().length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No visits found</p>
              {filterDate && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Try changing your filter settings
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {paginatedVisits().map((visit) => {
                    const entryTime = formatDateTime(visit.entry_time);
                    const exitTime = visit.exit_time ? formatDateTime(visit.exit_time) : null;
                    const duration = formatDuration(visit.entry_time, visit.exit_time);
                    const purpose = formatPurpose(visit.purpose);
                    
                    return (
                      <tr key={visit.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {visit.client ? `${visit.client.first_name} ${visit.client.last_name}` : 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {visit.client?.gender || 'N/A'}, {visit.client?.age || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{entryTime.time}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{entryTime.date}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {exitTime ? (
                            <>
                              <div className="text-sm text-gray-900 dark:text-white">{exitTime.time}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{exitTime.date}</div>
                            </>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            !visit.exit_time 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {duration}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${purpose.colorClass}`}>
                            {purpose.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {visit.client_id ? (
                              <Link to={`/clients/${visit.client_id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 flex items-center">
                              <span>Details</span>
                              <ChevronRightIcon className="w-4 h-4 ml-1" />
                            </Link>
                          ) : (
                            <span className="text-gray-400">No client data</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )
          )}
        </CardContent>
        
        {/* Pagination */}
        {(viewMode === 'grouped' && Object.keys(groupedClients).length > 0) || 
         (viewMode === 'flat' && filteredVisitsPerPage().length > 0) ? (
          <CardFooter className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(viewMode === 'grouped' ? totalClientsPages : totalPagesPerFilter, currentPage + 1))}
                disabled={currentPage === (viewMode === 'grouped' ? totalClientsPages : totalPagesPerFilter)}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * ITEMS_PER_PAGE, viewMode === 'grouped' 
                      ? Object.keys(groupedClients).length 
                      : filteredVisitsPerPage().length)}
                  </span>{' '}
                  of <span className="font-medium">
                    {viewMode === 'grouped' 
                      ? Object.keys(groupedClients).length 
                      : filteredVisitsPerPage().length}
                  </span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {[...Array(viewMode === 'grouped' ? totalClientsPages : totalPagesPerFilter)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        currentPage === i + 1
                          ? 'z-10 bg-primary-50 dark:bg-primary-900 border-primary-500 dark:border-primary-500 text-primary-600 dark:text-primary-200'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } text-sm font-medium`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(viewMode === 'grouped' ? totalClientsPages : totalPagesPerFilter, currentPage + 1))}
                    disabled={currentPage === (viewMode === 'grouped' ? totalClientsPages : totalPagesPerFilter)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </CardFooter>
        ) : null}
      </Card>

      {/* Statistics sections remain unchanged */}
      <div className="mt-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visit Purpose Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(getPurposeStats()).map(([purpose, count]) => (
            <div key={purpose} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {purpose}
              </div>
              <div className="text-lg font-semibold">
                {count} visits
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visit Duration Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(getDurationStats()).map(([duration, count]) => (
            <div key={duration} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {duration}
              </div>
              <div className="text-lg font-semibold">
                {count} visits
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default History; 