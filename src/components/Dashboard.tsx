import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, TrendingUp, Loader2, RefreshCw, Upload, FileText, Clock, Globe, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { analyticsApi, getAccessToken, TrendData } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onNavigate?: (page: string, filters?: Record<string, string>) => void;
}

// Extended stats interface with new fields
interface ExtendedDashboardStats {
  total_feedback: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  pending_count: number;
  today_count: number;
  average_confidence: number;
  resolution_rate: number;
  total_change?: string;
  feedback_in_range?: number;
  language_distribution?: {
    arabic: number;
    english: number;
    total: number;
  };
  priority_distribution?: {
    high: number;
    medium: number;
    low: number;
    urgent: number;
  };
  last_updated?: string;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [stats, setStats] = useState<ExtendedDashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchData = useCallback(async (showRefreshing = false) => {
    const token = getAccessToken();
    if (!token) {
      console.log('No token available');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Build query params for filters
      const statsParams: Record<string, string> = { days: '30' };
      if (dateRange.from) statsParams.date_from = dateRange.from;
      if (dateRange.to) statsParams.date_to = dateRange.to;
      if (sentimentFilter !== 'all') statsParams.sentiment = sentimentFilter;

      // Fetch stats and trends in parallel
      const [statsData, trendsData] = await Promise.all([
        analyticsApi.getStats(statsParams).catch(() => null),
        analyticsApi.getTrends({ days: 30 }).catch(() => []),
      ]);

      if (statsData) {
        setStats(statsData as ExtendedDashboardStats);
      }
      console.log('Trends data received:', trendsData);
      setTrends(trendsData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange.from, dateRange.to, sentimentFilter]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Handle filter apply
  const handleApplyFilters = () => {
    fetchData();
  };

  // Handle filter clear
  const handleClearFilters = () => {
    setDateRange({ from: '', to: '' });
    setSentimentFilter('all');
    // Fetch with cleared filters
    setTimeout(() => fetchData(), 0);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchData(true);
  };

  // Handle card click for drill-down
  const handleCardClick = (sentiment?: string) => {
    if (onNavigate) {
      const filters: Record<string, string> = {};
      if (sentiment) filters.sentiment = sentiment;
      onNavigate('feedback', filters);
    }
  };

  // Quick action handlers
  const handleUploadClick = () => {
    if (onNavigate) onNavigate('upload');
  };

  const handleReportsClick = () => {
    if (onNavigate) onNavigate('reports');
  };

  // Use API stats - show zeros when no data
  const displayStats = {
    total_feedback: stats?.total_feedback ?? 0,
    positive_count: stats?.positive_count ?? 0,
    negative_count: stats?.negative_count ?? 0,
    neutral_count: stats?.neutral_count ?? 0,
    pending_count: stats?.pending_count ?? 0,
    today_count: stats?.today_count ?? 0,
    average_confidence: stats?.average_confidence ?? 0,
    resolution_rate: stats?.resolution_rate ?? 0,
    total_change: stats?.total_change ?? '0%',
  };

  const total = displayStats.positive_count + displayStats.negative_count + displayStats.neutral_count || 1;
  const positivePercentage = Math.round((displayStats.positive_count / total) * 100);
  const negativePercentage = Math.round((displayStats.negative_count / total) * 100);
  const neutralPercentage = Math.round((displayStats.neutral_count / total) * 100);

  const pieData = [
    { name: 'Positive', value: displayStats.positive_count, color: '#10B981' },
    { name: 'Negative', value: displayStats.negative_count, color: '#EF4444' },
    { name: 'Neutral', value: displayStats.neutral_count, color: '#F59E0B' },
  ];

  // Language distribution data
  const languageData = stats?.language_distribution ? [
    { name: 'Arabic', value: stats.language_distribution.arabic, color: '#3B82F6' },
    { name: 'English', value: stats.language_distribution.english, color: '#8B5CF6' },
  ] : [];

  // Priority distribution data
  const priorityData = stats?.priority_distribution ? [
    { name: 'Urgent', value: stats.priority_distribution.urgent, fill: '#DC2626' },
    { name: 'High', value: stats.priority_distribution.high, fill: '#F59E0B' },
    { name: 'Medium', value: stats.priority_distribution.medium, fill: '#3B82F6' },
    { name: 'Low', value: stats.priority_distribution.low, fill: '#10B981' },
  ] : [];

  const displayTrends = trends;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLanguageBadge = (language: string) => {
    return language === 'AR' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Page Title with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Dashboard</h1>
          <p className="text-[#6B7280]">Overview of feedback analysis and sentiment trends</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastUpdated && (
            <div className="flex items-center gap-1 text-sm text-[#6B7280]">
              <Clock className="h-4 w-4" />
              <span>{formatLastUpdated()}</span>
            </div>
          )}
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}
          >
            {autoRefresh ? '● Live' : '○ Paused'}
          </button>
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-[#003366] hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleUploadClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-md hover:bg-[#002244] transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Feedback
        </button>
        <button
          onClick={handleReportsClick}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Generate Report
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
          <span className="ml-2 text-[#6B7280]">Loading dashboard data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-red-800 flex-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Feedback */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
              onClick={() => handleCardClick()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#6B7280] mb-2">Total Feedback</p>
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{displayStats.total_feedback.toLocaleString()}</h2>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">{displayStats.today_count} today</span>
                    {displayStats.total_change && (
                      <span className={`text-xs ml-1 ${displayStats.total_change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        ({displayStats.total_change})
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Positive Feedback */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg hover:border-green-300 transition-all"
              onClick={() => handleCardClick('positive')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#6B7280] mb-2">Positive Feedback</p>
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{displayStats.positive_count.toLocaleString()}</h2>
                  <span className="text-green-600 text-sm">{positivePercentage}% Positive</span>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Negative Feedback */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg hover:border-red-300 transition-all"
              onClick={() => handleCardClick('negative')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#6B7280] mb-2">Negative Feedback</p>
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{displayStats.negative_count.toLocaleString()}</h2>
                  <span className="text-red-600 text-sm">{negativePercentage}% Negative</span>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <ThumbsDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Neutral Feedback */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg hover:border-amber-300 transition-all"
              onClick={() => handleCardClick('neutral')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#6B7280] mb-2">Neutral Feedback</p>
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{displayStats.neutral_count.toLocaleString()}</h2>
                  <span className="text-amber-600 text-sm">{neutralPercentage}% Neutral</span>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Minus className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Average Confidence */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide">Avg Confidence</p>
                  <p className="text-xl font-semibold text-[#1F2937]">{displayStats.average_confidence}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">{Math.round(displayStats.average_confidence)}</span>
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide">Pending Review</p>
                  <p className="text-xl font-semibold text-[#1F2937]">{displayStats.pending_count}</p>
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Resolution Rate */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide">Resolution Rate</p>
                  <p className="text-xl font-semibold text-[#1F2937]">{displayStats.resolution_rate}%</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </div>

            {/* Language Split */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide">Languages</p>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      AR: {stats?.language_distribution?.arabic || 0}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                      EN: {stats?.language_distribution?.english || 0}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                  <Globe className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-[#1F2937]">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-[#1F2937]">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-[#1F2937]">Sentiment</label>
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button 
                  onClick={handleApplyFilters}
                  className="flex-1 h-10 px-4 bg-[#003366] text-white rounded-md hover:bg-[#002244] transition-colors"
                >
                  Apply Filters
                </button>
                <button 
                  onClick={handleClearFilters}
                  className="h-10 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-[#6B7280] mr-2">Quick:</span>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setDateRange({ from: today, to: today });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setDateRange({
                    from: weekAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setDateRange({
                    from: monthAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setDateRange({
                    from: firstDay.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                This Month
              </button>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#1F2937]">Sentiment Distribution</h3>
                <p className="text-sm text-[#6B7280]">
                  {dateRange.from && dateRange.to 
                    ? `${dateRange.from} to ${dateRange.to}` 
                    : 'Last 30 Days'}
                </p>
              </div>
              {displayStats.total_feedback === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-[#6B7280]">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                  <p>No feedback data available</p>
                  <button
                    onClick={handleUploadClick}
                    className="mt-3 text-sm text-[#003366] hover:underline"
                  >
                    Upload feedback to get started
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sentiment Trends */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#1F2937]">Sentiment Trends</h3>
                <p className="text-sm text-[#6B7280]">Daily sentiment counts</p>
              </div>
              {displayTrends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-[#6B7280]">
                  <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
                  <p>No trend data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={displayTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} name="Positive" dot={false} />
                    <Line type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} name="Negative" dot={false} />
                    <Line type="monotone" dataKey="neutral" stroke="#F59E0B" strokeWidth={2} name="Neutral" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Charts Row 2 - Language and Priority */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#1F2937]">Language Distribution</h3>
                <p className="text-sm text-[#6B7280]">Arabic vs English feedback</p>
              </div>
              {languageData.length === 0 || (languageData[0].value === 0 && languageData[1].value === 0) ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-[#6B7280]">
                  <Globe className="h-12 w-12 mb-2 opacity-50" />
                  <p>No language data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`lang-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Priority Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#1F2937]">Priority Distribution</h3>
                <p className="text-sm text-[#6B7280]">Feedback by priority level</p>
              </div>
              {priorityData.length === 0 || priorityData.every(p => p.value === 0) ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-[#6B7280]">
                  <AlertTriangle className="h-12 w-12 mb-2 opacity-50" />
                  <p>No priority data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={priorityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#6B7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={12} width={60} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>


        </>
      )}
    </div>
  );
}
