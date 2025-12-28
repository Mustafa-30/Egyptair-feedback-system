import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { reportsApi, ReportPreviewStats, ReportGenerateResponse, ApiError } from '../lib/api';

export function Reports() {
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
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
  });
  const [reportSections, setReportSections] = useState({
    executiveSummary: true,
    sentimentChart: true,
    trendChart: true,
    statsTable: true,
    negativeSamples: true,
  });
  const [reportTitle, setReportTitle] = useState('Feedback Analysis Report');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // API States
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ReportGenerateResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Preview stats
  const [previewStats, setPreviewStats] = useState<ReportPreviewStats | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch preview stats when filters change
  const fetchPreviewStats = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    
    try {
      // Build sentiment filter
      const sentiments: string[] = [];
      if (sentimentFilters.positive) sentiments.push('positive');
      if (sentimentFilters.negative) sentiments.push('negative');
      if (sentimentFilters.neutral) sentiments.push('neutral');
      
      // Build language filter
      const languages: string[] = [];
      if (languageFilters.arabic) languages.push('arabic');
      if (languageFilters.english) languages.push('english');
      
      const stats = await reportsApi.getPreview({
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
        sentiments: sentiments.length < 3 ? sentiments.join(',') : undefined,
        languages: languages.length < 2 ? languages.join(',') : undefined,
      });
      
      setPreviewStats(stats);
    } catch (err) {
      console.error('Failed to fetch preview stats:', err);
      // Don't show error for preview - just show default values
    } finally {
      setLoadingPreview(false);
    }
  }, [dateRange, sentimentFilters, languageFilters]);

  useEffect(() => {
    fetchPreviewStats();
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
    setIsGenerating(true);
    setProgress(0);
    setReportGenerated(false);
    setGeneratedReport(null);
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 300);

    try {
      // Build sentiment filter
      const sentiments: string[] = [];
      if (sentimentFilters.positive) sentiments.push('positive');
      if (sentimentFilters.negative) sentiments.push('negative');
      if (sentimentFilters.neutral) sentiments.push('neutral');
      
      // Build language filter
      const languages: string[] = [];
      if (languageFilters.arabic) languages.push('arabic');
      if (languageFilters.english) languages.push('english');

      const result = await reportsApi.generate({
        report_type: reportType,
        title: reportTitle,
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
        sentiments: sentiments.length < 3 ? sentiments.join(',') : undefined,
        languages: languages.length < 2 ? languages.join(',') : undefined,
        include_executive_summary: reportSections.executiveSummary,
        include_sentiment_chart: reportSections.sentimentChart,
        include_trend_chart: reportSections.trendChart,
        include_stats_table: reportSections.statsTable,
        include_negative_samples: reportSections.negativeSamples,
        include_logo: includeLogo,
        orientation: orientation,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setGeneratedReport(result);
      setReportGenerated(true);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Report generation failed:', err);
      if (err instanceof ApiError) {
        setError(err.detail || 'Failed to generate report');
      } else {
        setError('Failed to generate report. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedReport) return;
    
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const downloadUrl = `${API_BASE_URL}/reports/${generatedReport.report_id}/download`;
      
      // Fetch the file with authentication
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      
      // Get the file as a blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set filename based on report type
      const extension = generatedReport.file_format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `${generatedReport.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      a.download = filename;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download report. Please try again.');
    }
  };

  const handleReset = () => {
    setReportType('summary');
    setDateRange({ from: '', to: '' });
    setQuickSelect('');
    setSentimentFilters({ positive: true, negative: true, neutral: true });
    setLanguageFilters({ arabic: true, english: true });
    setReportSections({
      executiveSummary: true,
      sentimentChart: true,
      trendChart: true,
      statsTable: true,
      negativeSamples: true,
    });
    setReportTitle('Feedback Analysis Report');
    setIncludeLogo(true);
    setOrientation('portrait');
    setReportGenerated(false);
    setGeneratedReport(null);
    setProgress(0);
    setError(null);
  };

  const getEstimatedSize = () => {
    if (reportType === 'detailed') return '~5 MB';
    return '~2 MB';
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-[#003366] mb-2">Reports</h1>
        <p className="text-[#6B7280]">Generate comprehensive feedback analysis reports</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Report Generation Failed</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          {/* Report Type */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-[#1F2937] mb-4 font-semibold">Report Type</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="reportType"
                  value="summary"
                  checked={reportType === 'summary'}
                  onChange={(e) => setReportType(e.target.value as 'summary')}
                  className="w-4 h-4 text-[#003366]"
                />
                <div>
                  <div className="text-[#1F2937] font-medium">Summary Report (PDF)</div>
                  <div className="text-[#6B7280] text-sm">Overview with charts and key metrics</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="reportType"
                  value="detailed"
                  checked={reportType === 'detailed'}
                  onChange={(e) => setReportType(e.target.value as 'detailed')}
                  className="w-4 h-4 text-[#003366]"
                />
                <div>
                  <div className="text-[#1F2937] font-medium">Detailed Data Export (Excel)</div>
                  <div className="text-[#6B7280] text-sm">Complete dataset with all fields</div>
                </div>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-[#1F2937] mb-4 font-semibold">Date Range</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-[#6B7280] text-sm">From</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, from: e.target.value });
                      setQuickSelect('');
                    }}
                    className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-[#6B7280] text-sm">To</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, to: e.target.value });
                      setQuickSelect('');
                    }}
                    className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className={`px-4 py-2 rounded-md transition-colors text-sm ${
                      quickSelect === option.value
                        ? 'bg-[#003366] text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-[#1F2937] mb-4 font-semibold">Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-[#6B7280] text-sm">Sentiment</label>
                <div className="space-y-2">
                  {[
                    { key: 'positive', label: 'Include Positive', color: 'text-green-600' },
                    { key: 'negative', label: 'Include Negative', color: 'text-red-600' },
                    { key: 'neutral', label: 'Include Neutral', color: 'text-yellow-600' },
                  ].map((option) => (
                    <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sentimentFilters[option.key as keyof typeof sentimentFilters]}
                        onChange={(e) =>
                          setSentimentFilters({
                            ...sentimentFilters,
                            [option.key]: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className={`text-[#1F2937] ${option.color}`}>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-[#6B7280] text-sm">Language</label>
                <div className="space-y-2">
                  {[
                    { key: 'arabic', label: 'Arabic (العربية)' },
                    { key: 'english', label: 'English' },
                  ].map((option) => (
                    <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={languageFilters[option.key as keyof typeof languageFilters]}
                        onChange={(e) =>
                          setLanguageFilters({
                            ...languageFilters,
                            [option.key]: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[#1F2937]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Report Content (PDF Only) */}
          {reportType === 'summary' && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-[#1F2937] mb-4 font-semibold">Report Content</h3>
              <div className="space-y-2">
                {[
                  { key: 'executiveSummary', label: 'Executive Summary' },
                  { key: 'sentimentChart', label: 'Sentiment Distribution Chart' },
                  { key: 'trendChart', label: 'Trend Analysis Chart' },
                  { key: 'statsTable', label: 'Statistics Table' },
                  { key: 'negativeSamples', label: 'Sample Negative Feedback (Top 10)' },
                ].map((option) => (
                  <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportSections[option.key as keyof typeof reportSections]}
                      onChange={(e) =>
                        setReportSections({
                          ...reportSections,
                          [option.key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[#1F2937]">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Format Options */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-[#1F2937] mb-4 font-semibold">Format Options</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-[#6B7280] text-sm">Report Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Enter report title..."
                  className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLogo}
                  onChange={(e) => setIncludeLogo(e.target.checked)}
                  className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[#1F2937]">Include EgyptAir logo</span>
              </label>
              {reportType === 'summary' && (
                <div>
                  <label className="block mb-2 text-[#6B7280] text-sm">Page Orientation</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orientation"
                        value="portrait"
                        checked={orientation === 'portrait'}
                        onChange={(e) => setOrientation(e.target.value as 'portrait')}
                        className="w-4 h-4 text-[#003366]"
                      />
                      <span className="text-[#1F2937]">Portrait</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orientation"
                        value="landscape"
                        checked={orientation === 'landscape'}
                        onChange={(e) => setOrientation(e.target.value as 'landscape')}
                        className="w-4 h-4 text-[#003366]"
                      />
                      <span className="text-[#1F2937]">Landscape</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || (!sentimentFilters.positive && !sentimentFilters.negative && !sentimentFilters.neutral)}
              className="w-full h-12 bg-[#003366] text-white rounded-md hover:bg-[#004488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Report...
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
              className="w-full h-10 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 sticky top-8">
            <h3 className="text-[#1F2937] mb-4 font-semibold">Report Preview</h3>
            
            {!reportGenerated ? (
              <div>
                {isGenerating ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#003366]"></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#1F2937]">Generating report...</span>
                        <span className="text-[#1F2937]">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-[#003366] h-3 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        {progress < 30 && 'Fetching feedback data...'}
                        {progress >= 30 && progress < 60 && 'Calculating statistics...'}
                        {progress >= 60 && progress < 90 && 'Generating charts...'}
                        {progress >= 90 && 'Finalizing report...'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="aspect-[8.5/11] bg-gray-50 rounded border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                      <div className="text-center text-gray-500 p-4">
                        <FileText className="h-16 w-16 mx-auto mb-2 text-gray-400" />
                        <p className="font-medium">Preview not available</p>
                        <p className="text-gray-400 text-sm">Generate to view report</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {reportType === 'summary' ? 'PDF with charts' : 'Excel spreadsheet'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280] text-sm">Date range:</span>
                        <span className="text-[#1F2937] text-sm">
                          {dateRange.from && dateRange.to
                            ? `${dateRange.from} to ${dateRange.to}`
                            : 'All time'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280] text-sm">Total in database:</span>
                        <span className="text-[#1F2937] text-sm">
                          {loadingPreview ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            previewStats?.total_in_database?.toLocaleString() || '-'
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280] text-sm">Matching filters:</span>
                        <span className="text-[#1F2937] text-sm font-medium">
                          {loadingPreview ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            previewStats?.matching_filters?.toLocaleString() || '-'
                          )}
                        </span>
                      </div>
                      {previewStats && previewStats.matching_filters > 0 && (
                        <>
                          <hr className="border-gray-200" />
                          <div className="flex items-center justify-between">
                            <span className="text-green-600 text-sm">Positive:</span>
                            <span className="text-green-600 text-sm">
                              {previewStats.positive_count} ({previewStats.positive_pct}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-red-600 text-sm">Negative:</span>
                            <span className="text-red-600 text-sm">
                              {previewStats.negative_count} ({previewStats.negative_pct}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-yellow-600 text-sm">Neutral:</span>
                            <span className="text-yellow-600 text-sm">
                              {previewStats.neutral_count} ({previewStats.neutral_pct}%)
                            </span>
                          </div>
                        </>
                      )}
                      <hr className="border-gray-200" />
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280] text-sm">Estimated size:</span>
                        <span className="text-[#1F2937] text-sm">{getEstimatedSize()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : generatedReport ? (
              <div className="space-y-6">
                <div className="text-center py-6">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-[#1F2937] mb-2 font-semibold">Report Generated Successfully!</h3>
                  <p className="text-[#6B7280]">Your report is ready to download</p>
                </div>
                
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] text-sm">Report Type:</span>
                    <span className="text-[#1F2937] text-sm capitalize">
                      {generatedReport.report_type === 'summary' ? 'PDF Summary' : 'Excel Export'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] text-sm">Total Records:</span>
                    <span className="text-[#1F2937] text-sm">{generatedReport.total_records.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] text-sm">File Size:</span>
                    <span className="text-[#1F2937] text-sm">
                      {generatedReport.file_size_mb < 1 
                        ? `${Math.round(generatedReport.file_size / 1024)} KB`
                        : `${generatedReport.file_size_mb} MB`
                      }
                    </span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 text-sm">Positive:</span>
                    <span className="text-green-600 text-sm">{generatedReport.positive_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-600 text-sm">Negative:</span>
                    <span className="text-red-600 text-sm">{generatedReport.negative_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-600 text-sm">Neutral:</span>
                    <span className="text-yellow-600 text-sm">{generatedReport.neutral_count}</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] text-sm">Generated:</span>
                    <span className="text-[#1F2937] text-sm">
                      {new Date(generatedReport.generated_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleDownload}
                  className="w-full h-12 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download {generatedReport.file_format.toUpperCase()} Report
                </button>
                
                <button
                  onClick={() => {
                    setReportGenerated(false);
                    setGeneratedReport(null);
                    setProgress(0);
                  }}
                  className="w-full h-10 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
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
