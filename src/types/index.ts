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
