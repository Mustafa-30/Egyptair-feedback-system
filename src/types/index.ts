export type UserRole = 'agent' | 'supervisor';

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  lastLogin?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: User;
}

export interface SessionData {
  user: User;
  expiresAt: number;
  createdAt: number;
}

export type Sentiment = 'positive' | 'negative' | 'neutral';
export type Language = 'AR' | 'EN' | 'Mixed';
export type FeedbackSource = 'email' | 'survey' | 'social' | 'complaint' | 'upload' | 'manual' | 'other';
export type FeedbackStatus = 'pending' | 'in_progress' | 'reviewed' | 'resolved' | 'rejected' | 'archived';

export interface Feedback {
  id: string;
  date: string;
  text: string;
  language: Language;
  sentiment: Sentiment;
  confidence: number;
  preprocessedText?: string;
  uploadedAt?: string;
  analyzedAt?: string;
  modelVersion?: string;
  source?: FeedbackSource;
  status?: FeedbackStatus;
  flightNumber?: string;
  customerName?: string;
  customerEmail?: string;
  fileId?: number;  // Reference to FeedbackFile - matches ER Diagram
}

// ===============================
// FeedbackFile - Matches ER Diagram
// ===============================
export type FileStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type FileType = 'csv' | 'xlsx' | 'xls';

export interface FeedbackFile {
  fileId: number;
  fileName: string;
  fileType: FileType;
  fileSize?: number;
  filePath?: string;
  uploadDate: string;
  status: FileStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errorMessage?: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  createdAt: string;
  userId: number;
}

export interface FeedbackFileSummary {
  fileId: number;
  fileName: string;
  status: FileStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  successRate: number;
}

// ===============================
// Report - Matches ER Diagram
// ===============================
export type ReportType = 'summary' | 'detailed' | 'sentiment_analysis' | 'trend_analysis' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Report {
  reportId: number;
  title: string;
  description?: string;
  reportType: ReportType;
  createdAt: string;
  generatedAt?: string;
  filePath?: string;
  fileFormat: ReportFormat;
  fileSize?: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  filters?: Record<string, unknown>;
  totalRecords: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  status: ReportStatus;
  errorMessage?: string;
  userId: number;
}

export interface ReportSummary {
  totalRecords: number;
  positiveCount: number;
  positivePercentage: number;
  negativeCount: number;
  negativePercentage: number;
  neutralCount: number;
  neutralPercentage: number;
  dateRange?: {
    start: string;
    end: string;
  };
  sentimentTrends?: SentimentTrend[];
  languageDistribution?: Record<string, number>;
}

// ===============================
// Dashboard - Matches ER Diagram
// ===============================
export type DashboardType = 'overview' | 'sentiment' | 'trends' | 'custom';

export interface Dashboard {
  dashboardId: number;
  title: string;
  description?: string;
  dashboardType: DashboardType;
  layoutConfig?: Record<string, unknown>;
  chartConfig?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  isDefault: boolean;
  isPublic: boolean;
  refreshInterval: number;
  createdAt: string;
  updatedAt?: string;
  lastViewedAt?: string;
  userId: number;
  reportId?: number;
}

export interface ChartData {
  chartType: string;
  labels: string[];
  datasets: Record<string, unknown>[];
  options?: Record<string, unknown>;
}

export interface DashboardStats {
  totalFeedback: number;
  totalChange: string;
  positiveFeedback: number;
  positivePercentage: number;
  negativeFeedback: number;
  negativePercentage: number;
  neutralFeedback: number;
  neutralPercentage: number;
}

export interface SentimentTrend {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}
