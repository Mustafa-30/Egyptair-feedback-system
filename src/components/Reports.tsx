import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  TrendingUp,
  BarChart3,
  Route,
  MessageSquare,
  Settings,
  Calendar,
  Filter,
  FileDown,
  Info,
  User,
  Clock,
  Target,
  Gauge
} from 'lucide-react';
import { reportsApi, ReportPreviewStats, ReportGenerateResponse, ApiError, analyticsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Settings storage key - same as Settings component
const SETTINGS_KEY = 'egyptair_settings';

// Load analytics settings from localStorage
const loadAnalyticsSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      return {
        npsTarget: settings.npsTarget ?? 50,
        csatThreshold: settings.csatThreshold ?? 80,
        minReviewsPerRoute: settings.minReviewsPerRoute ?? 10,
      };
    }
  } catch (e) {
    console.error('Failed to load analytics settings:', e);
  }
  return { npsTarget: 50, csatThreshold: 80, minReviewsPerRoute: 10 };
};

// Report type definitions
type ReportCategory = 'executive' | 'operational' | 'route' | 'insights';

interface ReportTypeInfo {
  id: ReportCategory;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  sections: string[];
  exportFormats: ('pdf' | 'csv')[];
}

const REPORT_TYPES: ReportTypeInfo[] = [
  {
    id: 'executive',
    name: 'Executive Summary Report',
    description: 'High-level overview for management with sentiment breakdown, NPS vs target, and key trends',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'bg-blue-500',
    sections: ['Sentiment Overview', 'NPS Score vs Target', 'CSAT Status', 'Key Trends & Highlights'],
    exportFormats: ['pdf'],
  },
  {
    id: 'operational',
    name: 'Operational Performance Report',
    description: 'Detailed operational metrics including response times, resolution rates, and pending volumes',
    icon: <Gauge className="h-5 w-5" />,
    color: 'bg-green-500',
    sections: ['Average Response Time', 'Resolution Rate', 'Pending Feedback Volume', 'Processing Status'],
    exportFormats: ['pdf', 'csv'],
  },
  {
    id: 'route',
    name: 'Route Performance Report',
    description: 'Route rankings based on ratings, sentiment scores, and Wilson Score confidence',
    icon: <Route className="h-5 w-5" />,
    color: 'bg-purple-500',
    sections: ['Route Rankings', 'Average Rating by Route', 'Sentiment Score by Route', 'Ranking Methodology'],
    exportFormats: ['pdf', 'csv'],
  },
  {
    id: 'insights',
    name: 'Customer Feedback Insights Report',
    description: 'Deep analysis of feedback patterns, complaint categories, keywords, and language distribution',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'bg-amber-500',
    sections: ['Top Complaint Categories', 'Frequent Keywords', 'Language Distribution', 'Feedback Samples'],
    exportFormats: ['pdf', 'csv'],
  },
];

// Render counter for debugging
let renderCount = 0;

export function Reports() {
  const { user } = useAuth();
  
  // Debug render count
  renderCount++;
  console.log(`[Reports] Component rendered (count: ${renderCount})`);
  
  // Report configuration
  const [selectedReportType, setSelectedReportType] = useState<ReportCategory>('executive');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [quickSelect, setQuickSelect] = useState('');
  const [sentimentFilters, setSentimentFilters] = useState({
    positive: true,
    negative: true,
    neutral: true,
  });
  const [languageFilters, setLanguageFilters] = useState({
    arabic: true,
    english: true,
    mixed: true,
  });
  const [reportTitle, setReportTitle] = useState('');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // Section toggles for each report type
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>({
    // Executive
    sentimentOverview: true,
    npsVsTarget: true,
    csatStatus: true,
    keyTrends: true,
    // Operational
    avgResponseTime: true,
    resolutionRate: true,
    pendingVolume: true,
    processingStatus: true,
    // Route
    routeRankings: true,
    avgRatingByRoute: true,
    sentimentByRoute: true,
    rankingMethodology: true,
    // Insights
    topComplaints: true,
    frequentKeywords: true,
    languageDistribution: true,
    feedbackSamples: true,
  });
  
  // Analytics settings from localStorage
  const [analyticsSettings, setAnalyticsSettings] = useState(loadAnalyticsSettings());
  
  // API States
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ReportGenerateResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if component is mounted
  const isMountedRef = useRef(true);
  const generationInProgressRef = useRef(false);
  
  // Preview stats
  const [previewStats, setPreviewStats] = useState<ReportPreviewStats | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Dashboard stats for NPS/CSAT
  const [dashboardStats, setDashboardStats] = useState<{
    npsScore: number;
    csatScore: number;
    totalFeedback: number;
  } | null>(null);

  // Track mounted state and log mount/unmount
  useEffect(() => {
    console.log('[Reports] Component MOUNTED');
    isMountedRef.current = true;
    return () => {
      console.log('[Reports] Component UNMOUNTING');
      isMountedRef.current = false;
    };
  }, []);

  // Load analytics settings when component mounts
  useEffect(() => {
    setAnalyticsSettings(loadAnalyticsSettings());
  }, []);

  // Set default title based on report type
  useEffect(() => {
    const reportInfo = REPORT_TYPES.find(r => r.id === selectedReportType);
    if (reportInfo) {
      setReportTitle(reportInfo.name);
    }
  }, [selectedReportType]);

  // Fetch dashboard stats for NPS/CSAT
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const stats = await analyticsApi.getStats({ show_all: 'true' });
        if (stats) {
          // Calculate NPS (simplified - using positive as promoters, negative as detractors)
          const total = stats.total_feedback || 1;
          const promoterPct = ((stats.positive_count || 0) / total) * 100;
          const detractorPct = ((stats.negative_count || 0) / total) * 100;
          const npsScore = Math.round(promoterPct - detractorPct);
          
          // Calculate CSAT (positive + neutral as satisfied)
          const satisfiedCount = (stats.positive_count || 0) + (stats.neutral_count || 0);
          const csatScore = Math.round((satisfiedCount / total) * 100);
          
          setDashboardStats({
            npsScore,
            csatScore,
            totalFeedback: stats.total_feedback || 0,
          });
        }
      } catch (e) {
        console.error('Failed to fetch dashboard stats:', e);
      }
    };
    fetchDashboardStats();
  }, []);

  // Fetch preview stats when filters change (not when report is generating)
  const fetchPreviewStats = useCallback(async () => {
    // Don't fetch while generating report - use ref to avoid dependency
    if (generationInProgressRef.current) {
      console.log('[Preview] Skipping fetch - report generation in progress');
      return;
    }
    
    setLoadingPreview(true);
    
    try {
      const sentiments: string[] = [];
      if (sentimentFilters.positive) sentiments.push('positive');
      if (sentimentFilters.negative) sentiments.push('negative');
      if (sentimentFilters.neutral) sentiments.push('neutral');
      
      const languages: string[] = [];
      if (languageFilters.arabic) languages.push('arabic');
      if (languageFilters.english) languages.push('english');
      if (languageFilters.mixed) languages.push('mixed');
      
      const stats = await reportsApi.getPreview({
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
        sentiments: sentiments.length < 3 ? sentiments.join(',') : undefined,
        languages: languages.length < 3 ? languages.join(',') : undefined,
      });
      
      // Only update state if still mounted and not generating
      if (isMountedRef.current && !generationInProgressRef.current) {
        setPreviewStats(stats);
      }
    } catch (err) {
      console.error('Failed to fetch preview stats:', err);
    } finally {
      if (isMountedRef.current) {
        setLoadingPreview(false);
      }
    }
  }, [dateRange, sentimentFilters, languageFilters]); // Removed isGenerating and reportGenerated

  useEffect(() => {
    // Only fetch preview when not generating
    if (!generationInProgressRef.current) {
      fetchPreviewStats();
    }
  }, [fetchPreviewStats]);

  const handleQuickSelect = (period: string) => {
    setQuickSelect(period);
    const today = new Date();
    let fromDate = new Date();

    switch (period) {
      case 'last7':
        fromDate.setDate(today.getDate() - 7);
        break;
      case 'last30':
        fromDate.setDate(today.getDate() - 30);
        break;
      case 'lastQuarter':
        fromDate.setMonth(today.getMonth() - 3);
        break;
      case 'lastYear':
        fromDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        return;
    }

    setDateRange({
      from: fromDate.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
    });
  };

  const handleGenerateReport = async () => {
    // Prevent duplicate generation
    if (generationInProgressRef.current) {
      console.log('[Report Generation] Already in progress, ignoring click');
      return;
    }
    
    generationInProgressRef.current = true;
    
    console.log('='.repeat(50));
    console.log('[Report Generation] Starting report generation...');
    console.log('[Report Generation] Timestamp:', new Date().toISOString());
    console.log('[Report Generation] Report type:', selectedReportType);
    console.log('[Report Generation] Export format:', exportFormat);
    console.log('[Report Generation] Title:', reportTitle);
    console.log('[Report Generation] Analytics settings:', analyticsSettings);
    console.log('[Report Generation] Component mounted:', isMountedRef.current);
    
    // Set states atomically to prevent race conditions
    setIsGenerating(true);
    setProgress(0);
    setReportGenerated(false);
    setGeneratedReport(null);
    setError(null);

    const progressInterval = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(progressInterval);
        return;
      }
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 300);

    let intervalCleared = false;
    const clearProgressInterval = () => {
      if (!intervalCleared) {
        clearInterval(progressInterval);
        intervalCleared = true;
      }
    };

    try {
      const sentiments: string[] = [];
      if (sentimentFilters.positive) sentiments.push('positive');
      if (sentimentFilters.negative) sentiments.push('negative');
      if (sentimentFilters.neutral) sentiments.push('neutral');
      
      const languages: string[] = [];
      if (languageFilters.arabic) languages.push('arabic');
      if (languageFilters.english) languages.push('english');
      if (languageFilters.mixed) languages.push('mixed');

      // Validate at least one sentiment is selected
      if (sentiments.length === 0) {
        throw new Error('Please select at least one sentiment filter');
      }

      // Map report type to API report_type (csv = detailed/Excel, otherwise PDF)
      const apiReportType = exportFormat === 'csv' ? 'detailed' : 'summary';
      
      // Determine which sections to include based on selected report type
      // Each report type has different focus areas
      const getSectionsForReportType = () => {
        switch (selectedReportType) {
          case 'executive':
            return {
              include_executive_summary: enabledSections.sentimentOverview,
              include_sentiment_chart: enabledSections.sentimentOverview,
              include_nps_score: enabledSections.npsVsTarget,
              include_csat_score: enabledSections.csatStatus,
              include_monthly_nps_trend: enabledSections.keyTrends,
              include_trend_chart: enabledSections.keyTrends,
              include_top_routes: false,
              include_stats_table: false,
              include_negative_samples: false,
              include_complaint_categories: false,
            };
          case 'operational':
            return {
              include_executive_summary: true,
              include_sentiment_chart: false,
              include_nps_score: false,
              include_csat_score: false,
              include_monthly_nps_trend: false,
              include_trend_chart: false,
              include_top_routes: false,
              include_stats_table: enabledSections.processingStatus,
              include_negative_samples: false,
              include_complaint_categories: false,
            };
          case 'route':
            return {
              include_executive_summary: false,
              include_sentiment_chart: false,
              include_nps_score: false,
              include_csat_score: false,
              include_monthly_nps_trend: false,
              include_trend_chart: false,
              include_top_routes: enabledSections.routeRankings,
              include_stats_table: enabledSections.avgRatingByRoute || enabledSections.sentimentByRoute,
              include_negative_samples: false,
              include_complaint_categories: false,
            };
          case 'insights':
            return {
              include_executive_summary: false,
              include_sentiment_chart: enabledSections.languageDistribution,
              include_nps_score: false,
              include_csat_score: false,
              include_monthly_nps_trend: false,
              include_trend_chart: false,
              include_top_routes: false,
              include_stats_table: false,
              include_negative_samples: enabledSections.feedbackSamples,
              include_complaint_categories: enabledSections.topComplaints,
            };
          default:
            return {
              include_executive_summary: true,
              include_sentiment_chart: true,
              include_nps_score: true,
              include_csat_score: true,
              include_monthly_nps_trend: true,
              include_trend_chart: true,
              include_top_routes: true,
              include_stats_table: true,
              include_negative_samples: true,
              include_complaint_categories: true,
            };
        }
      };

      const reportSections = getSectionsForReportType();
      
      console.log('[Report Generation] Sending API request...');
      console.log('[Report Generation] Selected report type:', selectedReportType);
      console.log('[Report Generation] API report_type:', apiReportType);
      console.log('[Report Generation] Report sections:', reportSections);
      console.log('[Report Generation] API request params:', {
        report_type: apiReportType,
        title: reportTitle,
        date_from: dateRange.from,
        date_to: dateRange.to,
        sentiments: sentiments.join(','),
        languages: languages.join(','),
      });

      const result = await reportsApi.generate({
        report_type: apiReportType,
        title: reportTitle,
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
        sentiments: sentiments.length < 3 ? sentiments.join(',') : undefined,
        languages: languages.length < 3 ? languages.join(',') : undefined,
        ...reportSections,
        include_logo: includeLogo,
        orientation: orientation,
        nps_target: analyticsSettings.npsTarget,
        csat_threshold: analyticsSettings.csatThreshold,
        min_reviews_per_route: analyticsSettings.minReviewsPerRoute,
      });

      console.log('[Report Generation] API Response received:', result);
      console.log('[Report Generation] Component still mounted:', isMountedRef.current);
      
      clearProgressInterval();
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('[Report Generation] Component unmounted, aborting state update');
        generationInProgressRef.current = false;
        return;
      }
      
      setProgress(100);
      
      // Validate the response has required fields
      if (!result || !result.report_id) {
        throw new Error('Invalid response from server - missing report ID');
      }
      
      console.log('[Report Generation] Setting success state...');
      setGeneratedReport(result);
      setReportGenerated(true);
      setIsGenerating(false);
      generationInProgressRef.current = false;
      
      console.log('[Report Generation] ✓ Report generated successfully!');
      console.log('[Report Generation] Report ID:', result.report_id);
      console.log('='.repeat(50));
      
    } catch (err: unknown) {
      clearProgressInterval();
      console.error('[Report Generation] ✗ Failed:', err);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('[Report Generation] Component unmounted during error handling');
        generationInProgressRef.current = false;
        return;
      }
      
      let errorMessage = 'Failed to generate report. Please try again.';
      
      if (err instanceof ApiError) {
        console.error('[Report Generation] API Error Status:', err.status);
        console.error('[Report Generation] API Error Detail:', err.detail);
        errorMessage = err.detail || `Server error (${err.status}): ${err.message}`;
        
        // Don't trigger logout on report generation errors
        if (err.status === 401) {
          errorMessage = 'Session expired. Please refresh the page and try again.';
        }
      } else if (err instanceof Error) {
        console.error('[Report Generation] Error Message:', err.message);
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProgress(0);
      setIsGenerating(false);
      generationInProgressRef.current = false;
      console.log('[Report Generation] Error state set, generation ref cleared');
      console.log('='.repeat(50));
      // Don't reset reportGenerated or generatedReport on error - preserve previous state
    }
  };

  const handleDownload = async () => {
    if (!generatedReport) return;
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const downloadUrl = `${API_BASE_URL}/reports/${generatedReport.report_id}/download`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const extension = generatedReport.file_format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `${generatedReport.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download report. Please try again.');
    }
  };

  const handleReset = () => {
    console.log('[Reports] handleReset called');
    console.trace(); // Log stack trace to see who called this
    setSelectedReportType('executive');
    setExportFormat('pdf');
    setDateRange({ from: '', to: '' });
    setQuickSelect('');
    setSentimentFilters({ positive: true, negative: true, neutral: true });
    setLanguageFilters({ arabic: true, english: true, mixed: true });
    setReportTitle('Executive Summary Report');
    setIncludeLogo(true);
    setOrientation('portrait');
    setEnabledSections({
      sentimentOverview: true,
      npsVsTarget: true,
      csatStatus: true,
      keyTrends: true,
      avgResponseTime: true,
      resolutionRate: true,
      pendingVolume: true,
      processingStatus: true,
      routeRankings: true,
      avgRatingByRoute: true,
      sentimentByRoute: true,
      rankingMethodology: true,
      topComplaints: true,
      frequentKeywords: true,
      languageDistribution: true,
      feedbackSamples: true,
    });
    setReportGenerated(false);
    setGeneratedReport(null);
    setProgress(0);
    setError(null);
  };

  const selectedReport = REPORT_TYPES.find(r => r.id === selectedReportType);
  
  const getFilterSummary = () => {
    const parts: string[] = [];
    
    // Date range
    if (dateRange.from && dateRange.to) {
      parts.push(`${dateRange.from} to ${dateRange.to}`);
    } else if (dateRange.from) {
      parts.push(`From ${dateRange.from}`);
    } else if (dateRange.to) {
      parts.push(`Until ${dateRange.to}`);
    } else {
      parts.push('All time');
    }
    
    // Sentiments
    const selectedSentiments = Object.entries(sentimentFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (selectedSentiments.length < 3) {
      parts.push(`Sentiment: ${selectedSentiments.join(', ')}`);
    }
    
    // Languages
    const selectedLanguages = Object.entries(languageFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (selectedLanguages.length < 3) {
      parts.push(`Language: ${selectedLanguages.join(', ')}`);
    }
    
    return parts.join(' • ');
  };

  // Get sections for current report type
  const getCurrentSections = (): { key: string; label: string }[] => {
    switch (selectedReportType) {
      case 'executive':
        return [
          { key: 'sentimentOverview', label: 'Sentiment Overview' },
          { key: 'npsVsTarget', label: 'NPS Score vs Target' },
          { key: 'csatStatus', label: 'CSAT Status' },
          { key: 'keyTrends', label: 'Key Trends & Highlights' },
        ];
      case 'operational':
        return [
          { key: 'avgResponseTime', label: 'Average Response Time' },
          { key: 'resolutionRate', label: 'Resolution Rate' },
          { key: 'pendingVolume', label: 'Pending Feedback Volume' },
          { key: 'processingStatus', label: 'Processing Status' },
        ];
      case 'route':
        return [
          { key: 'routeRankings', label: 'Route Rankings' },
          { key: 'avgRatingByRoute', label: 'Average Rating by Route' },
          { key: 'sentimentByRoute', label: 'Sentiment Score by Route' },
          { key: 'rankingMethodology', label: 'Ranking Methodology Explanation' },
        ];
      case 'insights':
        return [
          { key: 'topComplaints', label: 'Top Complaint Categories' },
          { key: 'frequentKeywords', label: 'Frequent Keywords' },
          { key: 'languageDistribution', label: 'Language Distribution' },
          { key: 'feedbackSamples', label: 'Sample Feedback' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003366] dark:text-white mb-2">Reports</h1>
          <p className="text-[#6B7280] dark:text-gray-400">
            Generate comprehensive, presentation-ready reports aligned with dashboard analytics
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-gray-400">
          <Settings className="h-4 w-4" />
          <span>Analytics Settings Applied</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-300 font-medium">Report Generation Failed</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            <p className="text-red-500 dark:text-red-400 text-xs mt-2">
              Check browser console (F12) for detailed error logs.
            </p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300 p-1"
            title="Dismiss error"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Analytics Settings Info Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-indigo-800 dark:text-indigo-300 font-medium mb-1">Reports Use Current Analytics Settings</h4>
            <div className="flex flex-wrap gap-4 text-sm text-indigo-700 dark:text-indigo-400">
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                NPS Target: <strong>{analyticsSettings.npsTarget}</strong>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                CSAT Threshold: <strong>{analyticsSettings.csatThreshold}%</strong>
              </span>
              <span className="flex items-center gap-1">
                <Route className="h-4 w-4" />
                Min Reviews/Route: <strong>{analyticsSettings.minReviewsPerRoute}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Type Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-[#1F2937] dark:text-white font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Report Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REPORT_TYPES.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportType(report.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedReportType === report.id
                      ? 'border-[#003366] dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${report.color} text-white`}>
                      {report.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[#1F2937] dark:text-white">{report.name}</h4>
                      <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1">{report.description}</p>
                      <div className="flex gap-2 mt-2">
                        {report.exportFormats.map((format) => (
                          <span
                            key={format}
                            className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                          >
                            {format.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-[#1F2937] dark:text-white font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Date Range
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-[#6B7280] dark:text-gray-400 text-sm">From</label>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => {
                        setDateRange({ ...dateRange, from: e.target.value });
                        setQuickSelect('');
                      }}
                      className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[#6B7280] dark:text-gray-400 text-sm">To</label>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => {
                        setDateRange({ ...dateRange, to: e.target.value });
                        setQuickSelect('');
                      }}
                      className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'last7', label: 'Last 7 Days' },
                    { value: 'last30', label: 'Last 30 Days' },
                    { value: 'lastQuarter', label: 'Last Quarter' },
                    { value: 'lastYear', label: 'Last Year' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleQuickSelect(option.value)}
                      className={`px-3 py-2 rounded-md transition-colors text-sm ${
                        quickSelect === option.value
                          ? 'bg-[#003366] text-white'
                          : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-[#1F2937] dark:text-white font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Data Filters
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-[#6B7280] dark:text-gray-400 text-sm">Sentiment Scope</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'positive', label: 'Positive', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
                      { key: 'neutral', label: 'Neutral', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
                      { key: 'negative', label: 'Negative', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() =>
                          setSentimentFilters({
                            ...sentimentFilters,
                            [option.key]: !sentimentFilters[option.key as keyof typeof sentimentFilters],
                          })
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          sentimentFilters[option.key as keyof typeof sentimentFilters]
                            ? option.color
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-[#6B7280] dark:text-gray-400 text-sm">Language</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'arabic', label: '🇪🇬 Arabic' },
                      { key: 'english', label: '🇬🇧 English' },
                      { key: 'mixed', label: '🌐 Mixed' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() =>
                          setLanguageFilters({
                            ...languageFilters,
                            [option.key]: !languageFilters[option.key as keyof typeof languageFilters],
                          })
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          languageFilters[option.key as keyof typeof languageFilters]
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Sections & Customization */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-[#1F2937] dark:text-white font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Report Sections
              <span className="text-sm font-normal text-[#6B7280] dark:text-gray-400 ml-2">
                (for {selectedReport?.name})
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {getCurrentSections().map((section) => (
                <label
                  key={section.key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={enabledSections[section.key]}
                    onChange={(e) =>
                      setEnabledSections({
                        ...enabledSections,
                        [section.key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[#1F2937] dark:text-white text-sm">{section.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format Options */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-[#1F2937] dark:text-white font-semibold mb-4 flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Export Options
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-[#6B7280] dark:text-gray-400 text-sm">Export Format</label>
                  <div className="flex gap-3">
                    {selectedReport?.exportFormats.map((format) => (
                      <button
                        key={format}
                        onClick={() => setExportFormat(format)}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                          exportFormat === format
                            ? 'border-[#003366] bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`font-medium ${exportFormat === format ? 'text-[#003366] dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {format.toUpperCase()}
                          </div>
                          <div className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
                            {format === 'pdf' ? 'For presentations' : 'For data analysis'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {exportFormat === 'pdf' && (
                  <div>
                    <label className="block mb-2 text-[#6B7280] dark:text-gray-400 text-sm">Page Orientation</label>
                    <div className="flex gap-3">
                      {['portrait', 'landscape'].map((orient) => (
                        <button
                          key={orient}
                          onClick={() => setOrientation(orient as 'portrait' | 'landscape')}
                          className={`flex-1 px-4 py-2 rounded-md transition-all capitalize ${
                            orientation === orient
                              ? 'bg-[#003366] text-white'
                              : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {orient}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-[#6B7280] dark:text-gray-400 text-sm">Report Title</label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Enter report title..."
                    className="w-full h-10 px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLogo}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[#1F2937] dark:text-white">Include EgyptAir logo</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Actions */}
        <div className="space-y-6">
          {/* Report Preview Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 sticky top-4">
            <h3 className="text-[#1F2937] dark:text-white font-semibold mb-4">Report Preview</h3>
            
            {!reportGenerated ? (
              <div className="space-y-4">
                {isGenerating ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#003366]"></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#1F2937] dark:text-white">Generating report...</span>
                        <span className="text-[#1F2937] dark:text-white">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                        <div
                          className="bg-[#003366] h-3 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                        {progress < 30 && 'Fetching feedback data...'}
                        {progress >= 30 && progress < 60 && 'Calculating analytics...'}
                        {progress >= 60 && progress < 90 && 'Generating visualizations...'}
                        {progress >= 90 && 'Finalizing report...'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Preview Thumbnail */}
                    <div className="aspect-[8.5/11] bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                        <div className={`mx-auto mb-3 p-4 rounded-full ${selectedReport?.color} text-white w-fit`}>
                          {selectedReport?.icon}
                        </div>
                        <p className="font-medium">{selectedReport?.name}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          {exportFormat.toUpperCase()} format
                        </p>
                      </div>
                    </div>
                    
                    {/* Preview Stats */}
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280] dark:text-gray-400 text-sm">Records Matching:</span>
                        <span className="text-[#1F2937] dark:text-white text-sm font-medium">
                          {loadingPreview ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            previewStats?.matching_filters?.toLocaleString() || '-'
                          )}
                        </span>
                      </div>
                      {previewStats && previewStats.matching_filters > 0 && (
                        <>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded">
                              <div className="text-green-600 dark:text-green-400 font-medium">{previewStats.positive_count}</div>
                              <div className="text-xs text-green-600 dark:text-green-400">Positive</div>
                            </div>
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded">
                              <div className="text-yellow-600 dark:text-yellow-400 font-medium">{previewStats.neutral_count}</div>
                              <div className="text-xs text-yellow-600 dark:text-yellow-400">Neutral</div>
                            </div>
                            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded">
                              <div className="text-red-600 dark:text-red-400 font-medium">{previewStats.negative_count}</div>
                              <div className="text-xs text-red-600 dark:text-red-400">Negative</div>
                            </div>
                          </div>
                          {dashboardStats && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <div className="text-center">
                                <div className="text-sm text-[#6B7280] dark:text-gray-400">NPS Score</div>
                                <div className={`font-bold ${
                                  dashboardStats.npsScore >= analyticsSettings.npsTarget 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {dashboardStats.npsScore}
                                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400"> / {analyticsSettings.npsTarget}</span>
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm text-[#6B7280] dark:text-gray-400">CSAT</div>
                                <div className={`font-bold ${
                                  dashboardStats.csatScore >= analyticsSettings.csatThreshold
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                  {dashboardStats.csatScore}%
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Inline Error Display */}
                {error && !isGenerating && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-2">{error}</span>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || (!sentimentFilters.positive && !sentimentFilters.negative && !sentimentFilters.neutral)}
                  className="w-full h-12 bg-[#003366] text-white rounded-md hover:bg-[#004488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      Generate Report
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            ) : generatedReport ? (
              <div className="space-y-4">
                {/* Success State */}
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-[#1F2937] dark:text-white font-semibold">Report Ready!</h3>
                </div>
                
                {/* Report Metadata */}
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <div className="font-medium text-[#1F2937] dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                    Report Metadata
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#6B7280]" />
                    <span className="text-[#6B7280] dark:text-gray-400">Title:</span>
                    <span className="text-[#1F2937] dark:text-white ml-auto">{generatedReport.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#6B7280]" />
                    <span className="text-[#6B7280] dark:text-gray-400">Generated:</span>
                    <span className="text-[#1F2937] dark:text-white ml-auto">
                      {new Date(generatedReport.generated_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#6B7280]" />
                    <span className="text-[#6B7280] dark:text-gray-400">Generated by:</span>
                    <span className="text-[#1F2937] dark:text-white ml-auto capitalize">{user?.role || 'User'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[#6B7280]" />
                    <span className="text-[#6B7280] dark:text-gray-400">Filters:</span>
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 pl-6">{getFilterSummary()}</p>
                  <hr className="border-gray-200 dark:border-gray-600" />
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] dark:text-gray-400">Total Records:</span>
                    <span className="text-[#1F2937] dark:text-white font-medium">{generatedReport.total_records.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] dark:text-gray-400">File Size:</span>
                    <span className="text-[#1F2937] dark:text-white">
                      {generatedReport.file_size_mb < 1 
                        ? `${Math.round(generatedReport.file_size / 1024)} KB`
                        : `${generatedReport.file_size_mb} MB`
                      }
                    </span>
                  </div>
                </div>

                {/* Download Button */}
                <button 
                  onClick={handleDownload}
                  className="w-full h-12 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download {generatedReport.file_format.toUpperCase()}
                </button>
                
                <button
                  onClick={() => {
                    setReportGenerated(false);
                    setGeneratedReport(null);
                    setProgress(0);
                  }}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Generate Another Report
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
