import { useState } from 'react';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { Feedback } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackDetailModalProps {
  feedback: Feedback | null;
  onClose: () => void;
}

export function FeedbackDetailModal({ feedback, onClose }: FeedbackDetailModalProps) {
  const { user } = useAuth();
  const [showPreprocessed, setShowPreprocessed] = useState(false);
  const [overrideSentiment, setOverrideSentiment] = useState('');

  if (!feedback) return null;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500 text-white';
      case 'negative':
        return 'bg-red-500 text-white';
      case 'neutral':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const handleOverride = () => {
    if (!overrideSentiment) return;
    alert(`Sentiment overridden to: ${overrideSentiment}`);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this feedback entry? This action cannot be undone.')) {
      alert('Feedback deleted successfully');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-[#1F2937]">Feedback Details</h2>
            <p className="text-[#6B7280]">
              ID: {feedback.id} • {new Date(feedback.date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Original Feedback */}
          <div>
            <label className="block mb-2 text-[#1F2937]">Customer Feedback</label>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-[#1F2937] leading-relaxed" style={{ direction: feedback.language === 'AR' ? 'rtl' : 'ltr' }}>
                {feedback.text}
              </p>
            </div>
            <div className="mt-2">
              <span className={`inline-block px-2 py-1 rounded text-xs ${
                feedback.language === 'AR' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                Language: {feedback.language === 'AR' ? 'Arabic' : 'English'}
              </span>
            </div>
          </div>

          {/* Analysis Results */}
          <div>
            <h3 className="text-[#1F2937] mb-4">Analysis Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-[#6B7280]">Sentiment Classification</label>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg capitalize ${getSentimentColor(feedback.sentiment)}`}>
                      {feedback.sentiment}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-[#6B7280]">Confidence Score</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          feedback.confidence >= 90 
                            ? 'bg-green-500' 
                            : feedback.confidence >= 70 
                            ? 'bg-blue-500' 
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${feedback.confidence}%` }}
                      />
                    </div>
                    <span className="text-[#1F2937]">{feedback.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[#6B7280]">Language Detected</label>
                  <p className="text-[#1F2937]">{feedback.language === 'AR' ? 'Arabic' : 'English'}</p>
                </div>
                <div>
                  <label className="block text-[#6B7280]">Uploaded</label>
                  <p className="text-[#1F2937]">
                    {feedback.uploadedAt ? new Date(feedback.uploadedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-[#6B7280]">Analyzed</label>
                  <p className="text-[#1F2937]">
                    {feedback.analyzedAt ? new Date(feedback.analyzedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-[#6B7280]">Model Version</label>
                  <p className="text-[#1F2937]">{feedback.modelVersion}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preprocessed Text (Collapsible) */}
          <div>
            <button
              onClick={() => setShowPreprocessed(!showPreprocessed)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <span className="text-[#1F2937]">Preprocessed Text</span>
              {showPreprocessed ? (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-600" />
              )}
            </button>
            {showPreprocessed && (
              <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-[#6B7280] font-mono">{feedback.preprocessedText}</p>
                <p className="text-[#9CA3AF] mt-2">
                  This is the cleaned text used for sentiment analysis after removing stop words and special characters.
                </p>
              </div>
            )}
          </div>

          {/* Admin Actions (Supervisor Only) */}
          {user?.role === 'supervisor' && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-[#1F2937] mb-4">Admin Actions</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-[#1F2937]">Override Sentiment</label>
                  <div className="flex gap-2">
                    <select
                      value={overrideSentiment}
                      onChange={(e) => setOverrideSentiment(e.target.value)}
                      className="flex-1 h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select new sentiment...</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="neutral">Neutral</option>
                    </select>
                    <button
                      onClick={handleOverride}
                      disabled={!overrideSentiment}
                      className="px-4 py-2 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete Entry
                  </button>
                  <p className="text-[#6B7280] mt-2">
                    This action will permanently delete this feedback entry and cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button className="px-6 py-2 bg-[#003366] text-white rounded-md hover:bg-[#C5A572] transition-colors flex items-center gap-2">
            Next Feedback
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
