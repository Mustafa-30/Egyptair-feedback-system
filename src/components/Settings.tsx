import { useState, useEffect } from 'react';
import { Save, Download, Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { feedbackApi, uploadApi, usersApi, ApiError, analyticsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Settings storage key
const SETTINGS_KEY = 'egyptair_settings';

// Default settings
const DEFAULT_SETTINGS = {
  defaultDateRange: 'last30',
  rowsPerPage: 25,
  language: 'en',
  timezone: 'Africa/Cairo',
  emailNotifications: true,
  processingAlerts: true,
  weeklySummary: false,
  autoDelete: false,
  autoDeleteDays: 365,
  compactView: false,
  theme: 'light' as 'light' | 'dark',
};

// Load settings from localStorage
const loadSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
};

// Save settings to localStorage
const saveSettings = (settings: typeof DEFAULT_SETTINGS) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
};

export function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [exporting, setExporting] = useState(false);
  
  // System stats
  const [systemStats, setSystemStats] = useState({
    totalFeedback: 0,
    databaseSize: '0 KB',
    lastUpdate: 'Loading...',
  });

  // Load system stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await analyticsApi.getStats({ show_all: 'true' });
        if (stats) {
          setSystemStats({
            totalFeedback: stats.total_feedback || 0,
            databaseSize: formatBytes((stats.total_feedback || 0) * 2048), // Rough estimate
            lastUpdate: new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
          });
        }
      } catch (e) {
        console.error('Failed to load system stats:', e);
      }
    };
    fetchStats();
  }, []);

  // Apply theme and compact view to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    
    // Apply compact view
    if (settings.compactView) {
      root.classList.add('compact');
      document.body.classList.add('compact-mode');
    } else {
      root.classList.remove('compact');
      document.body.classList.remove('compact-mode');
    }
  }, [settings.theme, settings.compactView]);

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Save to localStorage
    const success = saveSettings(settings);
    
    // Simulate a brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSaving(false);
    
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      // Fetch all feedback data
      const response = await feedbackApi.getAll({ page: 1, page_size: 10000 });
      const feedbackItems = response.items || [];
      
      if (feedbackItems.length === 0) {
        alert('No feedback data to export.');
        setExporting(false);
        return;
      }

      // Convert to CSV
      const headers = ['ID', 'Comment', 'Sentiment', 'Rating', 'Route', 'Flight Number', 'Category', 'Source', 'Language', 'Created At'];
      const csvRows = [headers.join(',')];
      
      for (const item of feedbackItems) {
        const row = [
          item.id,
          `"${(item.comment || '').replace(/"/g, '""')}"`,
          item.sentiment || '',
          item.rating || '',
          item.route || '',
          item.flight_number || '',
          item.category || '',
          item.source || '',
          item.language || '',
          item.created_at || '',
        ];
        csvRows.push(row.join(','));
      }

      // Create and download file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `egyptair_feedback_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${feedbackItems.length} feedback entries!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleClearAllData = async () => {
    if (clearConfirmText !== 'DELETE ALL') {
      alert('Please type "DELETE ALL" to confirm');
      return;
    }

    // Check if user has permission (admin or supervisor)
    console.log('Current user:', user);
    if (!user || (user.role !== 'admin' && user.role !== 'supervisor')) {
      alert(`Permission denied: Only administrators and supervisors can clear all data.\n\nYour role: ${user?.role || 'unknown'}`);
      return;
    }

    try {
      setClearingData(true);
      console.log('Attempting to clear all feedback data...');
      console.log('User role:', user.role);
      
      const result = await feedbackApi.clearAll();
      
      console.log('Clear data result:', result);
      alert(`✅ Successfully deleted ${result.deleted_count} feedback entries!`);
      setShowClearConfirm(false);
      setClearConfirmText('');
      // Refresh the page to reflect changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: unknown) {
      console.error('Clear data error:', error);
      
      let errorMessage = 'Failed to clear data. Unknown error occurred.';
      
      // Check if error has ApiError-like properties (status, detail)
      if (error && typeof error === 'object' && 'status' in error && 'detail' in error) {
        const apiError = error as { status: number; detail: string; message?: string };
        errorMessage = apiError.detail || apiError.message || 'API Error';
        if (apiError.status === 403 || apiError.status === 401) {
          errorMessage = `Permission denied: ${errorMessage}\n\nOnly administrators and supervisors can clear all data.`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        errorMessage = String(errObj.detail || errObj.message || JSON.stringify(error));
      }
      
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setClearingData(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-[#003366] mb-2">Settings</h1>
        <p className="text-[#6B7280]">Manage your application preferences and configurations</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-[#1F2937] mb-4">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-[#1F2937]">Default Date Range for Dashboard</label>
            <select
              value={settings.defaultDateRange}
              onChange={(e) => setSettings({ ...settings, defaultDateRange: e.target.value })}
              className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="lastYear">Last Year</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-[#1F2937]">Rows Per Page in Tables</label>
            <select
              value={settings.rowsPerPage}
              onChange={(e) => setSettings({ ...settings, rowsPerPage: Number(e.target.value) })}
              className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-[#1F2937]">Interface Language</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-[#1F2937]">Time Zone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
              <option value="UTC">UTC (GMT+0)</option>
              <option value="America/New_York">America/New York (GMT-5)</option>
              <option value="Europe/London">Europe/London (GMT+0)</option>
              <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-[#1F2937] mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-md transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="w-5 h-5 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <div className="text-[#1F2937]">Email Notifications</div>
              <div className="text-[#6B7280]">Receive notifications via email</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-md transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.processingAlerts}
                onChange={(e) => setSettings({ ...settings, processingAlerts: e.target.checked })}
                className="w-5 h-5 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <div className="text-[#1F2937]">Processing Completion Alerts</div>
              <div className="text-[#6B7280]">Get notified when file processing is complete</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-md transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.weeklySummary}
                onChange={(e) => setSettings({ ...settings, weeklySummary: e.target.checked })}
                className="w-5 h-5 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <div className="text-[#1F2937]">Weekly Summary Email</div>
              <div className="text-[#6B7280]">Receive a weekly summary of feedback analysis</div>
            </div>
          </label>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-[#1F2937] mb-4">Data Management</h3>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={settings.autoDelete}
                onChange={(e) => setSettings({ ...settings, autoDelete: e.target.checked })}
                className="w-5 h-5 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[#1F2937]">Auto-delete old data</span>
            </label>
            {settings.autoDelete && (
              <div className="ml-8">
                <label className="block mb-2 text-[#6B7280]">Delete data older than (days)</label>
                <input
                  type="number"
                  value={settings.autoDeleteDays}
                  onChange={(e) => setSettings({ ...settings, autoDeleteDays: Number(e.target.value) })}
                  min={30}
                  max={3650}
                  className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-[#1F2937] mb-2">Data Retention Policy</h4>
            <p className="text-[#6B7280]">
              Feedback data is retained according to EgyptAir's data retention policy. 
              By default, all feedback is kept indefinitely unless auto-delete is enabled. 
              Deleted data cannot be recovered.
            </p>
          </div>

          <div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="w-full h-12 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Export All Data
                </>
              )}
            </button>
            <p className="text-[#6B7280] mt-2">
              Download a complete backup of all feedback data in CSV format
            </p>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-[#1F2937] mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-[#6B7280] mb-1">System Version</div>
            <div className="text-[#1F2937]">v2.5.0</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-[#6B7280] mb-1">Data As Of</div>
            <div className="text-[#1F2937]">{systemStats.lastUpdate}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-[#6B7280] mb-1">Total Feedback Processed</div>
            <div className="text-[#1F2937]">{systemStats.totalFeedback.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-[#6B7280] mb-1">Estimated Database Size</div>
            <div className="text-[#1F2937]">{systemStats.databaseSize}</div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-[#1F2937] dark:text-white mb-4">Appearance</h3>
        <div className="space-y-3">
          <div>
            <label className="block mb-2 text-[#1F2937] dark:text-gray-200">Theme</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={settings.theme === 'light'}
                  onChange={() => setSettings({ ...settings, theme: 'light' })}
                  className="w-4 h-4 text-[#003366]"
                />
                <span className="text-[#1F2937] dark:text-gray-200">Light Mode</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={settings.theme === 'dark'}
                  onChange={() => setSettings({ ...settings, theme: 'dark' })}
                  className="w-4 h-4 text-[#003366]"
                />
                <span className="text-[#1F2937] dark:text-gray-200">Dark Mode</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
            <input
              type="checkbox"
              checked={settings.compactView}
              onChange={(e) => setSettings({ ...settings, compactView: e.target.checked })}
              className="w-5 h-5 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="text-[#1F2937] dark:text-gray-200">Compact View</div>
              <div className="text-[#6B7280] dark:text-gray-400">Reduce spacing for more content on screen</div>
            </div>
          </label>
        </div>
      </div>

      {/* Data Management - DANGER ZONE */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
        <h3 className="text-red-600 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[#1F2937] font-medium mb-1">Clear All Feedback Data</h4>
                <p className="text-[#6B7280] text-sm">
                  Permanently delete all feedback entries from the database. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Data
              </button>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[#1F2937] font-medium mb-1">Export All Data</h4>
                <p className="text-[#6B7280] text-sm">
                  Download a complete backup of all feedback data before clearing.
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1F2937]">Confirm Data Deletion</h3>
                <p className="text-sm text-[#6B7280]">This action is permanent and cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">
                <strong>Warning:</strong> This will permanently delete ALL feedback entries from the database. 
                Make sure you have exported any data you need before proceeding.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#1F2937] mb-2">
                Type <strong className="text-red-600">DELETE ALL</strong> to confirm:
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="DELETE ALL"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  setClearConfirmText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-[#1F2937] rounded-md hover:bg-gray-50 transition-colors"
                disabled={clearingData}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllData}
                disabled={clearConfirmText !== 'DELETE ALL' || clearingData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearingData ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete All Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="sticky bottom-0 bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            {saved && (
              <span className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Settings saved successfully
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
