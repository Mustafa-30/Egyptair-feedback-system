import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, XCircle, Cloud, Download, AlertCircle } from 'lucide-react';
import { uploadApi, ApiError } from '../lib/api';

interface UploadFeedbackProps {
  onNavigate?: (page: string) => void;
}

interface PreviewRow {
  id: string;
  text: string;
  language: string;
  sentiment: string;
}

export function UploadFeedback({ onNavigate }: UploadFeedbackProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ 
    total: 0, 
    processed: 0, 
    errors: 0,
    duplicatesRemoved: 0,
    duplicatesSkipped: 0,
    duplicatesInFile: 0 
  });
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      setUploadStatus('idle');
      setErrorMessage(null);
      await loadPreview(droppedFile);
    } else {
      alert('Please upload a valid CSV or Excel file (max 50MB)');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setUploadStatus('idle');
      setErrorMessage(null);
      await loadPreview(selectedFile);
    } else {
      alert('Please upload a valid CSV or Excel file (max 50MB)');
    }
  };

  const loadPreview = async (selectedFile: File) => {
    try {
      const preview = await uploadApi.preview(selectedFile);
      // Map sample data to preview format
      const rows: PreviewRow[] = preview.sample_data?.slice(0, 5).map((row: Record<string, string>, idx: number) => ({
        id: `ROW${idx + 1}`,
        text: row[preview.text_column] || Object.values(row)[0] || '',
        language: row.language || 'Auto-detect',
        sentiment: 'Pending',
      })) || [];
      setPreviewData(rows);
    } catch (err) {
      console.error('Preview error:', err);
      // Use fallback preview data
      setPreviewData([
        { id: 'FB001', text: 'Great service! Very satisfied...', language: 'EN', sentiment: 'Pending' },
        { id: 'FB002', text: 'الخدمة ممتازة والطاقم رائع...', language: 'AR', sentiment: 'Pending' },
      ]);
    }
  };

  const isValidFile = (file: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    return validTypes.includes(file.type) && file.size <= maxSize;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage(null);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev; // Pause at 90% until actual completion
        return prev + 5;
      });
    }, 100);

    try {
      // Call the actual API
      const result = await uploadApi.process(file, {
        analyzeSentiment: true,
        saveToDb: true,
        overwriteDuplicates: overwriteDuplicates,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadStats({
        total: result.total_rows,
        processed: result.saved_count,
        errors: result.error_count,
        duplicatesRemoved: result.duplicates_removed || 0,
        duplicatesSkipped: result.duplicates_skipped || 0,
        duplicatesInFile: result.duplicates_in_file || 0,
      });
      setUploadStatus('success');
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload error:', err);
      
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else {
        setErrorMessage('Failed to upload file. Please try again.');
      }
      setUploadStatus('error');
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadStats({ 
      total: 0, 
      processed: 0, 
      errors: 0,
      duplicatesRemoved: 0,
      duplicatesSkipped: 0,
      duplicatesInFile: 0 
    });
    setPreviewData([]);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-[#003366] mb-2">Upload Feedback</h1>
        <p className="text-[#6B7280]">Upload CSV or Excel files for sentiment analysis</p>
      </div>

      {uploadStatus === 'idle' || uploadStatus === 'uploading' ? (
        <>
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Cloud className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-[#1F2937] mb-2">Drag and drop your CSV or Excel file here</h3>
                <p className="text-[#6B7280] mb-4">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-[#9CA3AF] mt-4">Supported: .csv, .xlsx, .xls (Max 50MB)</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* File Info */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded">
                      <File className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-[#1F2937]">{file.name}</div>
                      <div className="text-[#6B7280]">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    disabled={uploadStatus === 'uploading'}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Data Preview */}
                <div>
                  <h4 className="text-[#1F2937] mb-3">Data Preview (First 5 rows)</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-[#1F2937]">ID</th>
                          <th className="px-4 py-2 text-left text-[#1F2937]">Feedback Text</th>
                          <th className="px-4 py-2 text-left text-[#1F2937]">Language</th>
                          <th className="px-4 py-2 text-left text-[#1F2937]">Sentiment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-2 text-[#6B7280]">{row.id}</td>
                            <td className="px-4 py-2 text-[#6B7280]">{row.text}</td>
                            <td className="px-4 py-2 text-[#6B7280]">{row.language}</td>
                            <td className="px-4 py-2 text-[#6B7280]">{row.sentiment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Processing Options */}
                <div className="space-y-3">
                  <h4 className="text-[#1F2937]">Processing Options</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwriteDuplicates}
                      onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                      className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[#1F2937]">Overwrite duplicate feedback IDs</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="w-4 h-4 text-[#003366] border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[#1F2937]">Send notification when processing completes</span>
                  </label>
                </div>

                {/* Upload Progress */}
                {uploadStatus === 'uploading' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#1F2937]">Uploading... {uploadProgress}% complete</span>
                      <button className="text-red-600 hover:text-red-700">Cancel</button>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={uploadStatus === 'uploading'}
                  className="w-full h-12 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload className="h-5 w-5" />
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload and Analyze'}
                </button>
              </div>
            )}
          </div>
        </>
      ) : uploadStatus === 'success' ? (
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-[#1F2937] mb-2">Upload Successful!</h2>
          <p className="text-[#6B7280] mb-6">Your feedback has been processed and analyzed</p>
          
          <div className="grid grid-cols-3 gap-4 mb-4 max-w-2xl mx-auto">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-[#003366] text-2xl font-bold mb-1">{uploadStats.total}</div>
              <div className="text-[#6B7280] text-sm">Total Records</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-green-600 text-2xl font-bold mb-1">{uploadStats.processed}</div>
              <div className="text-[#6B7280] text-sm">Successfully Saved</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-red-600 text-2xl font-bold mb-1">{uploadStats.errors}</div>
              <div className="text-[#6B7280] text-sm">Errors</div>
            </div>
          </div>
          
          {/* Duplicate Stats */}
          {(uploadStats.duplicatesRemoved > 0 || uploadStats.duplicatesSkipped > 0 || uploadStats.duplicatesInFile > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
              <h4 className="text-yellow-800 font-medium mb-2">📋 Duplicate Handling</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {uploadStats.duplicatesRemoved > 0 && (
                  <div className="text-yellow-700">
                    <span className="font-medium">{uploadStats.duplicatesRemoved}</span> replaced
                  </div>
                )}
                {uploadStats.duplicatesSkipped > 0 && (
                  <div className="text-yellow-700">
                    <span className="font-medium">{uploadStats.duplicatesSkipped}</span> skipped (existing)
                  </div>
                )}
                {uploadStats.duplicatesInFile > 0 && (
                  <div className="text-yellow-700">
                    <span className="font-medium">{uploadStats.duplicatesInFile}</span> duplicates in file
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => onNavigate?.('dashboard')}
              className="px-6 py-2 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors"
            >
              View Dashboard
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              Upload Another File
            </button>
          </div>
          
          {uploadStats.errors > 0 && (
            <button className="mt-4 text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto">
              <Download className="h-4 w-4" />
              Download Error Log
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-[#1F2937] mb-2">Upload Failed</h2>
          <p className="text-[#6B7280] mb-6">There was an error processing your file. Please try again.</p>
          
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 text-left max-w-2xl mx-auto flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{errorMessage || 'Invalid file format or corrupted data'}</p>
          </div>

          <button
            onClick={handleReset}
            className="px-6 py-2 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
