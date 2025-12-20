import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, FileText, Eye, Edit, Trash2, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { Feedback } from '../types';
import { feedbackApi, getAccessToken, Feedback as ApiFeedback } from '../lib/api';

interface FeedbackListProps {
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

export function FeedbackList({ onViewFeedback }: FeedbackListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // API state
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch feedback from API
  const fetchFeedback = useCallback(async () => {
    // Check if we have a token before making API calls
    const token = getAccessToken();
    if (!token) {
      console.log('No token available');
      setFeedbackList([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params: Record<string, unknown> = {
        skip: (currentPage - 1) * rowsPerPage,
        limit: rowsPerPage,
      };

      if (selectedSentiment !== 'all') params.sentiment = selectedSentiment;
      if (selectedLanguage !== 'all') params.language = selectedLanguage;
      if (searchQuery) params.search = searchQuery;
      if (dateRange.from) params.date_from = dateRange.from;
      if (dateRange.to) params.date_to = dateRange.to;

      const response = await feedbackApi.getAll(params);
      setFeedbackList(response.items.map(mapApiFeedback));
      setTotalItems(response.total);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback.');
      setFeedbackList([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, selectedSentiment, selectedLanguage, searchQuery, dateRange]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSentiment, selectedLanguage, searchQuery, dateRange]);

  const activeFilters = [];
  if (selectedSentiment !== 'all') activeFilters.push({ label: `Sentiment: ${selectedSentiment}`, key: 'sentiment' });
  if (selectedLanguage !== 'all') activeFilters.push({ label: `Language: ${selectedLanguage}`, key: 'language' });
  if (dateRange.from) activeFilters.push({ label: `From: ${dateRange.from}`, key: 'dateFrom' });
  if (dateRange.to) activeFilters.push({ label: `To: ${dateRange.to}`, key: 'dateTo' });

  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const paginatedFeedback = feedbackList;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(paginatedFeedback.map(f => f.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(i => i !== id));
    }
  };

  const clearFilter = (key: string) => {
    switch (key) {
      case 'sentiment':
        setSelectedSentiment('all');
        break;
      case 'language':
        setSelectedLanguage('all');
        break;
      case 'dateFrom':
        setDateRange({ ...dateRange, from: '' });
        break;
      case 'dateTo':
        setDateRange({ ...dateRange, to: '' });
        break;
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedSentiment('all');
    setSelectedLanguage('all');
    setDateRange({ from: '', to: '' });
  };

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
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-[#003366] mb-2">Feedback List</h1>
        <p className="text-[#6B7280]">Browse and manage all feedback entries</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in feedback text..."
                className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              <option value="AR">Arabic</option>
              <option value="EN">English</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button className="h-10 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
            <button className="h-10 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF Report</span>
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#6B7280]">Active filters:</span>
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
              >
                {filter.label}
                <button
                  onClick={() => clearFilter(filter.key)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-800">
            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Export Selected
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedItems([])}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-[#6B7280]">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : (
            <>
              Showing {((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, totalItems)} of{' '}
              {totalItems} results
            </>
          )}
        </p>
        {error && (
          <span className="text-amber-600 text-sm">{error}</span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280]">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      {feedbackList.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === paginatedFeedback.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-[#1F2937] cursor-pointer hover:bg-gray-100">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-[#1F2937] cursor-pointer hover:bg-gray-100">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-[#1F2937]">Feedback Text</th>
                  <th className="px-6 py-3 text-left text-[#1F2937]">Language</th>
                  <th className="px-6 py-3 text-left text-[#1F2937]">Sentiment</th>
                  <th className="px-6 py-3 text-left text-[#1F2937]">Confidence</th>
                  <th className="px-6 py-3 text-left text-[#1F2937]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedFeedback.map((feedback) => (
                  <React.Fragment key={feedback.id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === feedback.id ? null : feedback.id)}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(feedback.id)}
                          onChange={(e) => handleSelectItem(feedback.id, e.target.checked)}
                          className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#1F2937]">{feedback.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#1F2937]">
                        {new Date(feedback.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-[#1F2937] max-w-md">
                        <div className="truncate" title={feedback.text}>
                          {feedback.text.substring(0, 100)}
                          {feedback.text.length > 100 ? '...' : ''}
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
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onViewFeedback(feedback)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === feedback.id && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <div>
                              <span className="text-[#1F2937]">Full Text: </span>
                              <p className="text-[#6B7280] mt-1">{feedback.text}</p>
                            </div>
                            <div>
                              <span className="text-[#1F2937]">Preprocessed Text: </span>
                              <p className="text-[#6B7280] mt-1">{feedback.preprocessedText}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#003366] text-white'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-[#6B7280]">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-10 h-10 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-[#1F2937] mb-2">No feedback found</h3>
          <p className="text-[#6B7280] mb-4">Try adjusting your filters</p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
