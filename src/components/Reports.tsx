import { useState } from 'react';
import { FileText, Download, CheckCircle } from 'lucide-react';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [progress, setProgress] = useState(0);

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

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setProgress(0);
    setReportGenerated(false);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 300);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setIsGenerating(false);
      setReportGenerated(true);
    }, 2000);
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
    setProgress(0);
  };

  const getFilteredCount = () => {
    // Mock calculation
    return 1247;
  };

  const getEstimatedSize = () => {
    // Mock calculation
    if (reportType === 'detailed') return '5.2';
    return '2.3';
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-[#003366] mb-2">Reports</h1>
        <p className="text-[#6B7280]">Generate comprehensive feedback analysis reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          {/* Report Type */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-[#1F2937] mb-4">Report Type</h3>
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
                  <div className="text-[#1F2937]">Summary Report (PDF)</div>
                  <div className="text-[#6B7280]">Overview with charts and key metrics</div>
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
                  <div className="text-[#1F2937]">Detailed Data Export (Excel)</div>
                  <div className="text-[#6B7280]">Complete dataset with all fields</div>
                </div>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-[#1F2937] mb-4">Date Range</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-[#6B7280]">From</label>
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
                  <label className="block mb-2 text-[#6B7280]">To</label>
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
                    className={`px-4 py-2 rounded-md transition-colors ${
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
            <h3 className="text-[#1F2937] mb-4">Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-[#6B7280]">Sentiment</label>
                <div className="space-y-2">
                  {[
                    { key: 'positive', label: 'Include Positive' },
                    { key: 'negative', label: 'Include Negative' },
                    { key: 'neutral', label: 'Include Neutral' },
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
                      <span className="text-[#1F2937]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-[#6B7280]">Language</label>
                <div className="space-y-2">
                  {[
                    { key: 'arabic', label: 'Arabic' },
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
              <h3 className="text-[#1F2937] mb-4">Report Content</h3>
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
            <h3 className="text-[#1F2937] mb-4">Format Options</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-[#6B7280]">Report Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
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
                  <label className="block mb-2 text-[#6B7280]">Page Orientation</label>
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
              disabled={isGenerating}
              className="w-full h-12 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FileText className="h-5 w-5" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
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
            <h3 className="text-[#1F2937] mb-4">Report Preview</h3>
            
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
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="aspect-[8.5/11] bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                      <div className="text-center text-gray-500">
                        <FileText className="h-16 w-16 mx-auto mb-2" />
                        <p>Preview not available</p>
                        <p className="text-gray-400">Generate to view report</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Date range:</span>
                        <span className="text-[#1F2937]">
                          {dateRange.from && dateRange.to
                            ? `${dateRange.from} to ${dateRange.to}`
                            : 'Not selected'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Total feedback entries:</span>
                        <span className="text-[#1F2937]">12,458</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Entries matching filters:</span>
                        <span className="text-[#1F2937]">{getFilteredCount()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Estimated report size:</span>
                        <span className="text-[#1F2937]">{getEstimatedSize()} MB</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center py-6">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-[#1F2937] mb-2">Report Generated Successfully!</h3>
                  <p className="text-[#6B7280]">Your report is ready to download</p>
                </div>
                
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Report Type:</span>
                    <span className="text-[#1F2937] capitalize">{reportType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">File Size:</span>
                    <span className="text-[#1F2937]">{getEstimatedSize()} MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Generated:</span>
                    <span className="text-[#1F2937]">
                      {new Date().toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <button className="w-full h-12 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  <Download className="h-5 w-5" />
                  Download Report
                </button>
                
                <button
                  onClick={() => setReportGenerated(false)}
                  className="w-full h-10 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Generate Another Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
