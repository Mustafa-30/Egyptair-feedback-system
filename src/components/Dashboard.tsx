import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, TrendingUp, Loader2, RefreshCw, Upload, FileText, Clock, Globe, AlertTriangle, Target, Plane, CheckCircle, TrendingDown, Download, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { analyticsApi, getAccessToken, TrendData, TopComplaint, RouteData, CsatData, ResponseTimeData, ComparisonData } from '../lib/api';
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

// CSAT Gauge Component
function CSATGauge({ score, grade, change }: { score: number; grade: string; change: number }) {
  const getGradeColor = () => {
    if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100' };
    if (score >= 60) return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100' };
    if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-100' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' };
  };
  
  const colors = getGradeColor();
  const circumference = 2 * Math.PI * 60;
  const strokeDasharray = (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="60" fill="none" stroke="#E5E7EB" strokeWidth="12" />
          <circle
            cx="70" cy="70" r="60" fill="none"
            stroke={score >= 80 ? '#10B981' : score >= 60 ? '#3B82F6' : score >= 40 ? '#F59E0B' : '#EF4444'}
            strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${strokeDasharray} ${circumference}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${colors.text}`}>{score}%</span>
          <span className="text-xs text-gray-500">CSAT</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.light} ${colors.text}`}>{grade}</span>
        <div className={`mt-2 text-sm flex items-center justify-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{change >= 0 ? '+' : ''}{change}% vs last period</span>
        </div>
      </div>
    </div>
  );
}

// Language Progress Bars Component
function LanguageProgressBars({ arabic, english }: { arabic: number; english: number }) {
  const total = arabic + english || 1;
  const arabicPct = Math.round((arabic / total) * 100);
  const englishPct = Math.round((english / total) * 100);
  
  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇪🇬</span>
            <span className="font-medium text-gray-700">Arabic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{arabic.toLocaleString()}</span>
            <span className="text-sm font-medium text-blue-600">{arabicPct}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500" style={{ width: `${arabicPct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇬🇧</span>
            <span className="font-medium text-gray-700">English</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{english.toLocaleString()}</span>
            <span className="text-sm font-medium text-purple-600">{englishPct}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500" style={{ width: `${englishPct}%` }} />
        </div>
      </div>
      <div className="pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Total Feedback</span>
          <span className="font-semibold text-gray-700">{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Top Complaints Component
function TopComplaints({ data, onViewAll }: { data: TopComplaint[]; onViewAll?: () => void }) {
  const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];
  return (
    <div className="space-y-3 p-4">
      {data.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No complaint data available</p>
        </div>
      ) : (
        <>
          {data.map((item, index) => (
            <div key={item.category} className="flex items-center gap-3">
              <div className="w-2 h-8 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.category}</span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, backgroundColor: colors[index % colors.length] }} />
                </div>
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">{item.percentage}%</span>
            </div>
          ))}
          {onViewAll && (
            <button onClick={onViewAll} className="w-full mt-2 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors">
              View All Complaints →
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Response Time Card Component
function ResponseTimeCard({ data }: { data: ResponseTimeData | null }) {
  if (!data) return <div className="flex items-center justify-center h-full text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  
  const getGradeColor = () => {
    switch (data.performance_grade) {
      case 'Excellent': return 'bg-green-100 text-green-700';
      case 'Good': return 'bg-blue-100 text-blue-700';
      case 'Fair': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-red-100 text-red-700';
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Avg Response Time</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.average_response_hours < 24 ? `${data.average_response_hours} hrs` : `${data.average_response_days} days`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor()}`}>{data.performance_grade}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">{data.total_resolved}</p>
          <p className="text-xs text-gray-500">Total Resolved</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-green-600">{data.resolved_today}</p>
          <p className="text-xs text-gray-500">Today</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-blue-600">{data.resolved_this_week}</p>
          <p className="text-xs text-gray-500">This Week</p>
        </div>
      </div>
    </div>
  );
}

// Feedback by Route Chart
function FeedbackByRouteChart({ data }: { data: RouteData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
        <Plane className="h-12 w-12 mb-2 opacity-50" />
        <p>No route data available</p>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data.slice(0, 8)} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis type="number" stroke="#6B7280" fontSize={12} />
        <YAxis type="category" dataKey="route" stroke="#6B7280" fontSize={11} width={70} />
        <Tooltip formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]} contentStyle={{ borderRadius: '8px' }} />
        <Legend />
        <Bar dataKey="positive" stackId="a" fill="#10B981" name="Positive" />
        <Bar dataKey="neutral" stackId="a" fill="#F59E0B" name="Neutral" />
        <Bar dataKey="negative" stackId="a" fill="#EF4444" name="Negative" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [stats, setStats] = useState<ExtendedDashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [topComplaints, setTopComplaints] = useState<TopComplaint[]>([]);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [csatData, setCsatData] = useState<CsatData | null>(null);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Refs for chart export
  const sentimentChartRef = useRef<HTMLDivElement>(null);
  const trendsChartRef = useRef<HTMLDivElement>(null);

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

      // Fetch all data in parallel
      const [statsData, trendsData, complaintsData, routesData, csatResult, responseData, comparisonResult] = await Promise.all([
        analyticsApi.getStats(statsParams).catch(() => null),
        analyticsApi.getTrends({ days: 30 }).catch(() => []),
        analyticsApi.getTopComplaints(5).catch(() => []),
        analyticsApi.getFeedbackByRoute(8).catch(() => []),
        analyticsApi.getCsatScore(30).catch(() => null),
        analyticsApi.getResponseTime().catch(() => null),
        analyticsApi.getComparison(30).catch(() => null),
      ]);

      if (statsData) {
        setStats(statsData as ExtendedDashboardStats);
      }
      console.log('Trends data received:', trendsData);
      setTrends(trendsData);
      setTopComplaints(complaintsData);
      setRouteData(routesData);
      setCsatData(csatResult);
      setResponseTimeData(responseData);
      setComparisonData(comparisonResult);
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

  const handleViewComplaints = () => {
    if (onNavigate) onNavigate('feedback', { sentiment: 'negative' });
  };

  // Export chart as image
  const exportChartAsImage = async (chartRef: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!chartRef.current) return;
    
    try {
      // Use html2canvas dynamically - fallback to simpler method if not available
      const element = chartRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Get SVG element from Recharts
      const svg = element.querySelector('svg');
      if (svg && ctx) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    } catch (err) {
      console.error('Error exporting chart:', err);
    }
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

  const displayTrends = trends;

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
        <button
          onClick={() => setShowComparison(!showComparison)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            showComparison 
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' 
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          {showComparison ? 'Hide Comparison' : 'Compare Periods'}
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
          {/* Comparison Panel */}
          {showComparison && comparisonData && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-md p-6 border border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Period Comparison (Last {comparisonData.period_days} days vs Previous)
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Total */}
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Total</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold">{comparisonData.current_period.stats.total}</span>
                    <span className={`text-xs flex items-center ${comparisonData.changes.total.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {comparisonData.changes.total.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(comparisonData.changes.total.value)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">was {comparisonData.previous_period.stats.total}</p>
                </div>
                {/* Positive */}
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Positive</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold text-green-600">{comparisonData.current_period.stats.positive}</span>
                    <span className={`text-xs flex items-center ${comparisonData.changes.positive.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {comparisonData.changes.positive.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(comparisonData.changes.positive.value)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">was {comparisonData.previous_period.stats.positive}</p>
                </div>
                {/* Negative */}
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Negative</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold text-red-600">{comparisonData.current_period.stats.negative}</span>
                    <span className={`text-xs flex items-center ${comparisonData.changes.negative.direction === 'down' ? 'text-green-600' : 'text-red-600'}`}>
                      {comparisonData.changes.negative.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(comparisonData.changes.negative.value)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">was {comparisonData.previous_period.stats.negative}</p>
                </div>
                {/* Neutral */}
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Neutral</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold text-amber-600">{comparisonData.current_period.stats.neutral}</span>
                    <span className={`text-xs flex items-center ${comparisonData.changes.neutral.direction === 'up' ? 'text-blue-600' : 'text-gray-600'}`}>
                      {comparisonData.changes.neutral.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(comparisonData.changes.neutral.value)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">was {comparisonData.previous_period.stats.neutral}</p>
                </div>
                {/* Positive % */}
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Positive %</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold text-green-600">{comparisonData.current_period.stats.positive_pct}%</span>
                    <span className={`text-xs flex items-center ${comparisonData.changes.positive_pct.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {comparisonData.changes.positive_pct.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(comparisonData.changes.positive_pct.value)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">was {comparisonData.previous_period.stats.positive_pct}%</p>
                </div>
                {/* Negative % */}
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Negative %</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold text-red-600">{comparisonData.current_period.stats.negative_pct}%</span>
                    <span className={`text-xs flex items-center ${comparisonData.changes.negative_pct.direction === 'down' ? 'text-green-600' : 'text-red-600'}`}>
                      {comparisonData.changes.negative_pct.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(comparisonData.changes.negative_pct.value)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">was {comparisonData.previous_period.stats.negative_pct}%</p>
                </div>
              </div>
            </div>
          )}

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

          {/* KPI Cards Row 2 - CSAT, Response Time, Pending, Resolution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CSAT Score Gauge */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Customer Satisfaction</h3>
                </div>
              </div>
              {csatData ? (
                <CSATGauge score={csatData.csat_score} grade={csatData.grade} change={csatData.change} />
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>

            {/* Response Time */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Response Performance</h3>
                </div>
              </div>
              <ResponseTimeCard data={responseTimeData} />
            </div>

            {/* Pending */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide">Pending Review</p>
                  <p className="text-2xl font-bold text-[#1F2937] mt-1">{displayStats.pending_count}</p>
                  <p className="text-sm text-orange-600 mt-1">Awaiting action</p>
                </div>
                <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center">
                  <Clock className="h-7 w-7 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Resolution Rate */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide">Resolution Rate</p>
                  <p className="text-2xl font-bold text-[#1F2937] mt-1">{displayStats.resolution_rate}%</p>
                  <p className="text-sm text-green-600 mt-1">Issues resolved</p>
                </div>
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-500" />
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
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200" ref={sentimentChartRef}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1F2937]">Sentiment Distribution</h3>
                  <p className="text-sm text-[#6B7280]">
                    {dateRange.from && dateRange.to 
                      ? `${dateRange.from} to ${dateRange.to}` 
                      : 'Last 30 Days'}
                  </p>
                </div>
                <button
                  onClick={() => exportChartAsImage(sentimentChartRef, 'sentiment-distribution')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Export as image"
                >
                  <Download className="h-4 w-4" />
                </button>
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

            {/* Sentiment Trends - Enhanced Area Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200" ref={trendsChartRef}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1F2937]">Sentiment Trends</h3>
                  <p className="text-sm text-[#6B7280]">Daily sentiment counts over time</p>
                </div>
                <button
                  onClick={() => exportChartAsImage(trendsChartRef, 'sentiment-trends')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Export as image"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
              {displayTrends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-[#6B7280]">
                  <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
                  <p>No trend data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={displayTrends}>
                    <defs>
                      <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} tickMargin={8} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Legend />
                    <Area type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorPositive)" name="Positive" connectNulls dot={{ r: 4 }} />
                    <Area type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorNegative)" name="Negative" connectNulls dot={{ r: 4 }} />
                    <Area type="monotone" dataKey="neutral" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorNeutral)" name="Neutral" connectNulls dot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Charts Row 2 - Language Distribution & Top Complaints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language Distribution - Progress Bars */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-[#1F2937]">Language Distribution</h3>
                </div>
                <p className="text-sm text-[#6B7280] mt-1">Arabic vs English feedback</p>
              </div>
              <LanguageProgressBars 
                arabic={stats?.language_distribution?.arabic || 0}
                english={stats?.language_distribution?.english || 0}
              />
            </div>

            {/* Top Complaints */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-[#1F2937]">Top Complaint Categories</h3>
                </div>
                <p className="text-sm text-[#6B7280] mt-1">Most common issues from negative feedback</p>
              </div>
              <TopComplaints data={topComplaints} onViewAll={handleViewComplaints} />
            </div>
          </div>

          {/* Charts Row 3 - Feedback by Route */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-[#1F2937]">Feedback by Flight Route</h3>
              </div>
              <p className="text-sm text-[#6B7280] mt-1">Sentiment breakdown by flight number</p>
            </div>
            <FeedbackByRouteChart data={routeData} />
          </div>


        </>
      )}
    </div>
  );
}
