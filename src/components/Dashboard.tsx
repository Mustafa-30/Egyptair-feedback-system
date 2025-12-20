import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, Eye, TrendingUp, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { analyticsApi, feedbackApi, getAccessToken, DashboardStats, TrendData, Feedback as ApiFeedback } from '../lib/api';
import { Feedback } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onViewFeedback: (feedback: Feedback) => void;
}

// Map API feedback to frontend type
function mapApiFeedback(apiFeedback: ApiFeedback): Feedback {
  return {
    id: String(apiFeedback.id),
    text: apiFeedback.text,
    language: apiFeedback.language,
    sentiment: apiFeedback.sentiment || 'neutral',
    confidence: apiFeedback.sentiment_confidence || 0,
    date: apiFeedback.feedback_date || apiFeedback.created_at,
    source: apiFeedback.source,
    flightNumber: apiFeedback.flight_number,
    customerName: apiFeedback.customer_name,
    customerEmail: apiFeedback.customer_email,
    status: apiFeedback.status,
  };
}

export function Dashboard({ onViewFeedback }: DashboardProps) {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data only when user is authenticated
  useEffect(() => {
    const fetchData = async () => {
      // Check if we have a token before making API calls
      const token = getAccessToken();
      if (!token) {
        console.log('No token available');
        setRecentFeedback([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch stats, trends, and recent feedback in parallel
        const [statsData, trendsData, feedbackData] = await Promise.all([
          analyticsApi.getStats().catch(() => null),
          analyticsApi.getTrends({ days: 30 }).catch(() => []),
          feedbackApi.getAll({ limit: 10 }).catch(() => ({ items: [], total: 0 })),
        ]);

        if (statsData) {
          setStats(statsData);
        }
        setTrends(trendsData);
        setRecentFeedback(feedbackData.items.map(mapApiFeedback));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data.');
        setRecentFeedback([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Use API stats - show zeros when no data (no mock data fallback)
  const displayStats = {
    total_feedback: stats?.total_feedback ?? 0,
    positive_count: stats?.positive_count ?? 0,
    negative_count: stats?.negative_count ?? 0,
    neutral_count: stats?.neutral_count ?? 0,
    pending_count: stats?.pending_count ?? 0,
    today_count: stats?.today_count ?? 0,
    average_confidence: stats?.average_confidence ?? 0,
    resolution_rate: stats?.resolution_rate ?? 0,
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

  // Use API trends - show empty array when no data
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

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-[#003366] mb-2">Dashboard</h1>
        <p className="text-[#6B7280]">Overview of feedback analysis and sentiment trends</p>
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Feedback */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#6B7280] mb-2">Total Feedback</p>
              <h2 className="text-[#1F2937] mb-1">{displayStats.total_feedback.toLocaleString()}</h2>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-green-600">{displayStats.today_count} today</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Positive Feedback */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#6B7280] mb-2">Positive Feedback</p>
              <h2 className="text-[#1F2937] mb-1">{displayStats.positive_count.toLocaleString()}</h2>
              <span className="text-[#6B7280]">{positivePercentage}% Positive Sentiment</span>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <ThumbsUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Negative Feedback */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#6B7280] mb-2">Negative Feedback</p>
              <h2 className="text-[#1F2937] mb-1">{displayStats.negative_count.toLocaleString()}</h2>
              <span className="text-[#6B7280]">{negativePercentage}% Negative Sentiment</span>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <ThumbsDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Neutral Feedback */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#6B7280] mb-2">Neutral Feedback</p>
              <h2 className="text-[#1F2937] mb-1">{displayStats.neutral_count.toLocaleString()}</h2>
              <span className="text-[#6B7280]">{neutralPercentage}% Neutral Sentiment</span>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Minus className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-2 text-[#1F2937]">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block mb-2 text-[#1F2937]">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block mb-2 text-[#1F2937]">Sentiment</label>
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
            <button className="flex-1 h-10 px-4 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors">
              Apply Filters
            </button>
            <button className="h-10 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-[#1F2937]">Sentiment Distribution</h3>
            <p className="text-[#6B7280]">Last 30 Days</p>
          </div>
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
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Trends */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-[#1F2937]">Sentiment Trends</h3>
            <p className="text-[#6B7280]">Daily sentiment counts</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={displayTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} name="Positive" />
              <Line type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} name="Negative" />
              <Line type="monotone" dataKey="neutral" stroke="#F59E0B" strokeWidth={2} name="Neutral" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Feedback Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-[#1F2937]">Recent Feedback</h3>
            <p className="text-[#6B7280]">Last 10 entries</p>
          </div>
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-[#1F2937]">Date</th>
                <th className="px-6 py-3 text-left text-[#1F2937]">Feedback Preview</th>
                <th className="px-6 py-3 text-left text-[#1F2937]">Language</th>
                <th className="px-6 py-3 text-left text-[#1F2937]">Sentiment</th>
                <th className="px-6 py-3 text-left text-[#1F2937]">Confidence</th>
                <th className="px-6 py-3 text-left text-[#1F2937]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentFeedback.map((feedback) => (
                <tr key={feedback.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-[#1F2937]">
                    {new Date(feedback.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-[#1F2937] max-w-md">
                    <div className="truncate" title={feedback.text}>
                      {feedback.text.substring(0, 80)}
                      {feedback.text.length > 80 ? '...' : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getLanguageBadge(feedback.language)}`}>
                      {feedback.language}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs capitalize ${getSentimentColor(feedback.sentiment)}`}>
                      {feedback.sentiment}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${feedback.confidence}%` }}
                        />
                      </div>
                      <span className="text-[#6B7280]">{feedback.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onViewFeedback(feedback)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {recentFeedback.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#6B7280]">
                    No feedback data available. Upload feedback to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
