import { useState } from 'react';
import { Save, Download } from 'lucide-react';

export function Settings() {
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

  const handleSave = () => {
    // Simulate saving
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    alert('Settings saved successfully!');
  };

  const handleExportData = () => {
    alert('Exporting all data... This may take a few minutes.');
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
