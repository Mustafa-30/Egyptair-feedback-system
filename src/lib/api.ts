/**
 * API Client for Backend Communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

const TOKEN_KEY = 'access_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Token management - use localStorage to persist across page refreshes
export const setAccessToken = (token: string | null, expiresIn?: number) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    if (expiresIn) {
      const expiry = Date.now() + expiresIn * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    }
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
};

export const getAccessToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  // Check if token is expired
  if (token && expiry) {
    if (Date.now() > parseInt(expiry)) {
      console.log('[AUTH] Token expired, clearing...');
      setAccessToken(null);
      return null;
    }
  }
  return token;
};

// Clear any stale session storage tokens (migration from old implementation)
if (typeof window !== 'undefined') {
  const oldToken = sessionStorage.getItem('access_token');
  if (oldToken && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, oldToken);
    sessionStorage.removeItem('access_token');
    console.log('[AUTH] Migrated token from sessionStorage to localStorage');
  }
}

// API Error class
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail || message;
    this.name = 'ApiError';
  }
}

// Base fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  
  console.log(`[API] ${endpoint} - Token: ${token ? 'YES (' + token.substring(0, 20) + '...)' : 'NO'}`);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    console.log('[API] Authorization header set');
  } else {
    console.warn('[API] No token available!');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  console.log(`[API] ${endpoint} - Response: ${response.status}`);

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    
    // Handle 401 - unauthorized (only logout if we had a token)
    if (response.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      // Don't clear token for /auth/me endpoint (session check)
      if (!endpoint.includes('/auth/me')) {
        console.log('[AUTH] 401 received, clearing token and triggering logout');
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
    
    throw new ApiError(response.status, errorDetail, errorDetail);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  
  return JSON.parse(text);
}

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    console.log('[AUTH] Login attempt for:', username);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    console.log('[AUTH] Login response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('[AUTH] Login failed:', error);
      throw new ApiError(response.status, error.detail || 'Login failed');
    }

    const data = await response.json();
    console.log('[AUTH] Login successful, token received:', data.access_token ? 'YES' : 'NO');
    
    if (data.access_token) {
      // Store token with expiry (backend returns expires_in in seconds)
      setAccessToken(data.access_token, data.expires_in);
      // Verify token was stored
      const storedToken = localStorage.getItem(TOKEN_KEY);
      console.log('[AUTH] Token stored in localStorage:', storedToken ? 'SUCCESS' : 'FAILED');
    }
    
    return data;
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  getCurrentUser: () => apiFetch<User>('/auth/me'),

  register: (data: CreateUserRequest) =>
    apiFetch<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Users API
export const usersApi = {
  getAll: (params?: { skip?: number; limit?: number; role?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.role) searchParams.append('role', params.role);
    if (params?.status) searchParams.append('status', params.status);
    
    const query = searchParams.toString();
    return apiFetch<User[]>(`/users/${query ? `?${query}` : ''}`);
  },

  getById: (id: number) => apiFetch<User>(`/users/${id}`),

  create: (data: CreateUserRequest) =>
    apiFetch<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: UpdateUserRequest) =>
    apiFetch<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// Feedback API
export const feedbackApi = {
  getAll: (params?: FeedbackQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.sentiment) searchParams.append('sentiment', params.sentiment);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.language) searchParams.append('language', params.language);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    
    const query = searchParams.toString();
    return apiFetch<PaginatedResponse<Feedback>>(`/feedback/${query ? `?${query}` : ''}`);
  },

  getById: (id: number) => apiFetch<Feedback>(`/feedback/${id}`),

  create: (data: CreateFeedbackRequest) =>
    apiFetch<Feedback>('/feedback/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: UpdateFeedbackRequest) =>
    apiFetch<Feedback>(`/feedback/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<{ message: string }>(`/feedback/${id}`, {
      method: 'DELETE',
    }),

  analyze: (id: number, useML: boolean = false) =>
    apiFetch<Feedback>(`/feedback/${id}/analyze?use_ml=${useML}`, {
      method: 'POST',
    }),

  analyzeBulk: (ids: number[], useML: boolean = false) =>
    apiFetch<{ analyzed_count: number; results: Feedback[] }>('/feedback/analyze-bulk', {
      method: 'POST',
      body: JSON.stringify({ feedback_ids: ids, use_ml: useML }),
    }),

  clearAll: () =>
    apiFetch<{ message: string; deleted_count: number }>('/feedback/actions/clear-all?confirm=true', {
      method: 'DELETE',
    }),
};

// Analytics API
export const analyticsApi = {
  getStats: (params?: { days?: string; date_from?: string; date_to?: string; sentiment?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.append('days', params.days);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    if (params?.sentiment) searchParams.append('sentiment', params.sentiment);
    
    const query = searchParams.toString();
    return apiFetch<DashboardStats>(`/analytics/dashboard${query ? `?${query}` : ''}`);
  },

  getTrends: (params?: { days?: number; granularity?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.append('days', params.days.toString());
    if (params?.granularity) searchParams.append('granularity', params.granularity);
    
    const query = searchParams.toString();
    return apiFetch<TrendData[]>(`/analytics/sentiment-trends${query ? `?${query}` : ''}`);
  },

  getCharts: () => apiFetch<ChartData>('/analytics/summary'),

  getTopComplaints: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiFetch<TopComplaint[]>(`/analytics/top-complaints${query}`);
  },

  getFeedbackByRoute: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiFetch<RouteData[]>(`/analytics/feedback-by-route${query}`);
  },

  getCsatScore: (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiFetch<CsatData>(`/analytics/csat-score${query}`);
  },

  getResponseTime: () => apiFetch<ResponseTimeData>('/analytics/response-time'),
};

// Upload API
export const uploadApi = {
  preview: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/upload/preview`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(response.status, error.detail || 'Upload failed');
    }

    return response.json();
  },

  process: async (file: File, options?: { textColumn?: string; analyzeSentiment?: boolean; saveToDb?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const searchParams = new URLSearchParams();
    if (options?.textColumn) searchParams.append('text_column', options.textColumn);
    if (options?.analyzeSentiment !== undefined) searchParams.append('analyze_sentiment', options.analyzeSentiment.toString());
    if (options?.saveToDb !== undefined) searchParams.append('save_to_db', options.saveToDb.toString());
    
    const token = getAccessToken();
    const query = searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/upload/process${query ? `?${query}` : ''}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(response.status, error.detail || 'Processing failed');
    }

    return response.json();
  },

  analyzeBatch: async (file: File, textColumn?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const searchParams = new URLSearchParams();
    if (textColumn) searchParams.append('text_column', textColumn);
    
    const token = getAccessToken();
    const query = searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/upload/analyze-batch${query ? `?${query}` : ''}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(response.status, error.detail || 'Analysis failed');
    }

    return response.json();
  },
};

// Types
export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  role: 'admin' | 'agent' | 'viewer' | 'supervisor';
  status: 'active' | 'inactive';
  avatar?: string;
  created_at?: string;
  last_login?: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  name: string;
  role?: 'admin' | 'agent' | 'viewer';
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: 'admin' | 'agent' | 'viewer';
  status?: 'active' | 'inactive';
  password?: string;
}

export interface Feedback {
  id: number;
  customer_name?: string;
  customer_email?: string;
  flight_number?: string;
  text: string;
  preprocessed_text?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentiment_confidence?: number;
  language: 'AR' | 'EN';
  source: 'email' | 'survey' | 'social' | 'complaint' | 'upload' | 'other';
  status: 'pending' | 'reviewed' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  feedback_date?: string;
  analyzed_at?: string;
  model_version?: string;
  response?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
  file_id?: number;  // Reference to FeedbackFile - matches ER Diagram
}

// ===============================
// FeedbackFile Types - Matches ER Diagram
// ===============================
export interface FeedbackFile {
  file_id: number;
  file_name: string;
  file_type: string;
  file_size?: number;
  file_path?: string;
  upload_date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  error_message?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  user_id: number;
}

export interface FeedbackFileSummary {
  file_id: number;
  file_name: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  success_rate: number;
}

// ===============================
// Report Types - Matches ER Diagram
// ===============================
export interface Report {
  report_id: number;
  title: string;
  description?: string;
  report_type: 'summary' | 'detailed' | 'sentiment_analysis' | 'trend_analysis' | 'custom';
  created_at: string;
  generated_at?: string;
  file_path?: string;
  file_format: 'pdf' | 'excel' | 'csv' | 'json';
  file_size?: number;
  date_range_start?: string;
  date_range_end?: string;
  filters?: Record<string, unknown>;
  total_records: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message?: string;
  user_id: number;
}

export interface ReportGenerateRequest {
  report_type: 'summary' | 'detailed' | 'sentiment_analysis' | 'trend_analysis' | 'custom';
  title?: string;
  date_range_start?: string;
  date_range_end?: string;
  filters?: Record<string, unknown>;
  export_format?: 'pdf' | 'excel' | 'csv' | 'json';
  include_charts?: boolean;
}

// ===============================
// Dashboard Types - Matches ER Diagram
// ===============================
export interface Dashboard {
  dashboard_id: number;
  title: string;
  description?: string;
  dashboard_type: 'overview' | 'sentiment' | 'trends' | 'custom';
  layout_config?: Record<string, unknown>;
  chart_config?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  is_default: boolean;
  is_public: boolean;
  refresh_interval: number;
  created_at: string;
  updated_at?: string;
  last_viewed_at?: string;
  user_id: number;
  report_id?: number;
}

export interface CreateFeedbackRequest {
  customer_name?: string;
  customer_email?: string;
  flight_number?: string;
  text: string;
  language?: 'AR' | 'EN';
  source?: string;
  priority?: string;
  analyze?: boolean;
}

export interface UpdateFeedbackRequest {
  status?: string;
  priority?: string;
  response?: string;
}

export interface FeedbackQueryParams {
  page?: number;
  page_size?: number;
  sentiment?: string;
  status?: string;
  priority?: string;
  language?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardStats {
  total_feedback: number;
  pending_count: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  today_count: number;
  average_confidence: number;
  resolution_rate: number;
}

export interface TrendData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export interface ChartData {
  sentiment_distribution: Array<{ name: string; value: number; color: string }>;
  priority_distribution: Array<{ name: string; value: number }>;
  source_distribution: Array<{ name: string; value: number }>;
  language_distribution: Array<{ name: string; value: number }>;
  status_distribution: Array<{ name: string; value: number }>;
}

// New analytics interfaces for enhanced dashboard
export interface TopComplaint {
  category: string;
  count: number;
  percentage: number;
}

export interface RouteData {
  route: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
}

export interface CsatData {
  csat_score: number;
  previous_score: number;
  change: number;
  positive_count: number;
  total_count: number;
  period_days: number;
  grade: string;
}

export interface ResponseTimeData {
  average_response_hours: number;
  average_response_days: number;
  total_resolved: number;
  resolved_today: number;
  resolved_this_week: number;
  performance_grade: string;
}

// ===============================
// API Functions for New Entities
// ===============================

// FeedbackFile API
export const filesApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    apiFetch<{ items: FeedbackFile[]; total: number; page: number; page_size: number; total_pages: number }>(
      `/v1/files/?${new URLSearchParams(params as Record<string, string> || {}).toString()}`
    ),
  
  get: (fileId: number) =>
    apiFetch<FeedbackFile>(`/v1/files/${fileId}`),
  
  getSummary: (fileId: number) =>
    apiFetch<FeedbackFileSummary>(`/v1/files/${fileId}/summary`),
  
  getRecords: (fileId: number, params?: { page?: number; page_size?: number; sentiment?: string }) =>
    apiFetch<{ file_id: number; file_name: string; items: Feedback[]; total: number }>(
      `/v1/files/${fileId}/records?${new URLSearchParams(params as Record<string, string> || {}).toString()}`
    ),
  
  delete: (fileId: number, deleteRecords?: boolean) =>
    apiFetch<{ message: string; file_id: number; records_deleted: number }>(
      `/v1/files/${fileId}?delete_records=${deleteRecords || false}`,
      { method: 'DELETE' }
    ),
  
  getOverview: () =>
    apiFetch<{ total_files: number; total_records: number; total_processed: number; by_status: Record<string, number> }>(
      '/v1/files/stats/overview'
    ),
};

// Report API
export interface ReportPreviewStats {
  total_in_database: number;
  matching_filters: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  date_range: {
    from: string | null;
    to: string | null;
  };
}

export interface ReportGenerateResponse {
  report_id: number;
  title: string;
  report_type: string;
  file_format: string;
  file_size: number;
  file_size_mb: number;
  total_records: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  generated_at: string;
  download_url: string;
  status: string;
}

export interface ReportGenerateParams {
  report_type: 'summary' | 'detailed';
  title: string;
  date_from?: string;
  date_to?: string;
  sentiments?: string; // comma-separated: positive,negative,neutral
  languages?: string; // comma-separated: arabic,english
  include_executive_summary?: boolean;
  include_sentiment_chart?: boolean;
  include_trend_chart?: boolean;
  include_stats_table?: boolean;
  include_negative_samples?: boolean;
  include_logo?: boolean;
  orientation?: 'portrait' | 'landscape';
}

export const reportsApi = {
  list: (params?: { page?: number; page_size?: number; report_type?: string; status?: string }) =>
    apiFetch<{ items: Report[]; total: number; page: number; page_size: number; total_pages: number }>(
      `/reports/?${new URLSearchParams(params as Record<string, string> || {}).toString()}`
    ),
  
  get: (reportId: number) =>
    apiFetch<Report>(`/reports/${reportId}`),
  
  getPreview: (params: {
    date_from?: string;
    date_to?: string;
    sentiments?: string;
    languages?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.date_from) searchParams.append('date_from', params.date_from);
    if (params.date_to) searchParams.append('date_to', params.date_to);
    if (params.sentiments) searchParams.append('sentiments', params.sentiments);
    if (params.languages) searchParams.append('languages', params.languages);
    const query = searchParams.toString();
    return apiFetch<ReportPreviewStats>(`/reports/preview${query ? `?${query}` : ''}`);
  },
  
  generate: async (params: ReportGenerateParams): Promise<ReportGenerateResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.append('report_type', params.report_type);
    searchParams.append('title', params.title);
    if (params.date_from) searchParams.append('date_from', params.date_from);
    if (params.date_to) searchParams.append('date_to', params.date_to);
    if (params.sentiments) searchParams.append('sentiments', params.sentiments);
    if (params.languages) searchParams.append('languages', params.languages);
    if (params.include_executive_summary !== undefined) 
      searchParams.append('include_executive_summary', params.include_executive_summary.toString());
    if (params.include_sentiment_chart !== undefined) 
      searchParams.append('include_sentiment_chart', params.include_sentiment_chart.toString());
    if (params.include_trend_chart !== undefined) 
      searchParams.append('include_trend_chart', params.include_trend_chart.toString());
    if (params.include_stats_table !== undefined) 
      searchParams.append('include_stats_table', params.include_stats_table.toString());
    if (params.include_negative_samples !== undefined) 
      searchParams.append('include_negative_samples', params.include_negative_samples.toString());
    if (params.include_logo !== undefined) 
      searchParams.append('include_logo', params.include_logo.toString());
    if (params.orientation) 
      searchParams.append('orientation', params.orientation);
    
    return apiFetch<ReportGenerateResponse>(`/reports/generate?${searchParams.toString()}`, {
      method: 'POST',
    });
  },
  
  download: (reportId: number) => {
    const token = getAccessToken();
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return `${API_BASE_URL}/reports/${reportId}/download?token=${token}`;
  },
  
  delete: (reportId: number) =>
    apiFetch<{ message: string; report_id: number }>(`/reports/${reportId}`, { method: 'DELETE' }),
  
  getOverview: () =>
    apiFetch<{ total_reports: number; by_type: Record<string, number>; recent_reports: Array<{ report_id: number; title: string; created_at: string; status: string; download_url: string }> }>(
      '/reports/stats/overview'
    ),
};

// Dashboard API
export const dashboardsApi = {
  list: (params?: { page?: number; page_size?: number; dashboard_type?: string }) =>
    apiFetch<{ items: Dashboard[]; total: number; page: number; page_size: number; total_pages: number }>(
      `/v1/dashboards/?${new URLSearchParams(params as Record<string, string> || {}).toString()}`
    ),
  
  getDefault: () =>
    apiFetch<Dashboard>('/v1/dashboards/default'),
  
  get: (dashboardId: number) =>
    apiFetch<Dashboard>(`/v1/dashboards/${dashboardId}`),
  
  create: (data: Partial<Dashboard>) =>
    apiFetch<Dashboard>('/v1/dashboards/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (dashboardId: number, data: Partial<Dashboard>) =>
    apiFetch<Dashboard>(`/v1/dashboards/${dashboardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  refresh: (dashboardId: number) =>
    apiFetch<{ dashboard_id: number; refreshed_at: string; stats: DashboardStats }>(
      `/v1/dashboards/${dashboardId}/refresh`,
      { method: 'POST' }
    ),
  
  getCharts: (dashboardId: number) =>
    apiFetch<{ dashboard_id: number; charts: Array<{ id: string; type: string; title: string; data: unknown }>; generated_at: string }>(
      `/v1/dashboards/${dashboardId}/charts`
    ),
  
  delete: (dashboardId: number) =>
    apiFetch<{ message: string; dashboard_id: number }>(`/v1/dashboards/${dashboardId}`, { method: 'DELETE' }),
};
