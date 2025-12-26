import { useState } from 'react';
import { Save, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { feedbackApi, uploadApi, usersApi, ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    defaultDateRange: 'last30',
    rowsPerPage: 25,
    language: 'en',
    timezone: 'Africa/Cairo',
    emailNotifications: true,
    processingAlerts: true,
    weeklySummary: false,
    autoDelete: false,
    autoDeleteDays: 365,
  });

  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  const handleSave = () => {
    // Simulate saving
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    alert('Settings saved successfully!');
  };

  const handleExportData = () => {
    alert('Exporting all data... This may take a few minutes.');
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
    } catch (error: any) {
      console.error('Clear data error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'null');
      
      let errorMessage = 'Failed to clear data. Unknown error occurred.';
      
      if (error instanceof ApiError) {
        errorMessage = error.detail || error.message;
        if (error.status === 403 || error.status === 401) {
          errorMessage = `Permission denied: ${errorMessage}\n\nOnly administrators and supervisors can clear all data.`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = error.detail || error.message || JSON.stringify(error);
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
              <option value="ar">العربية (Arabic)</option>
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
              className="w-full h-12 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              Export All Data
            </button>
            <p className="text-[#6B7280] mt-2">
              Download a complete backup of all feedback data in Excel format
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
            <div className="text-[#1F2937]">v2.4.1</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-[#6B7280] mb-1">Last Update</div>
            <div className="text-[#1F2937]">December 1, 2025</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-[#6B7280] mb-1">Total Feedback Processed</div>
            <div className="text-[#1F2937]">12,458</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-[#6B7280] mb-1">Database Size</div>
            <div className="text-[#1F2937]">247 MB</div>
          </div>
        </div>
      </div>

      {/* Appearance (Optional) */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-[#1F2937] mb-4">Appearance</h3>
        <div className="space-y-3">
          <div>
            <label className="block mb-2 text-[#1F2937]">Theme</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  defaultChecked
                  className="w-4 h-4 text-[#003366]"
                />
                <span className="text-[#1F2937]">Light Mode</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer opacity-50 cursor-not-allowed">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  disabled
                  className="w-4 h-4 text-[#003366]"
                />
                <span className="text-[#6B7280]">Dark Mode (Coming Soon)</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-md transition-colors">
            <input
              type="checkbox"
              className="w-5 h-5 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="text-[#1F2937]">Compact View</div>
              <div className="text-[#6B7280]">Reduce spacing for more content on screen</div>
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
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Export Data
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
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Settings saved successfully
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors flex items-center gap-2"
          >
            <Save className="h-5 w-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
