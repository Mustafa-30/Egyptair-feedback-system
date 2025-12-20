/**
 * Application constants for Egypt Air Sentiment Analysis
 */

// Application Info
export const APP_NAME = 'EgyptAir Sentiment Analysis';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Customer Relationship Management - Sentiment Analysis System';

// Brand Colors
export const COLORS = {
  primary: '#003366', // EgyptAir Navy
  secondary: '#C5A572', // EgyptAir Gold
  background: '#F5F7FA',
  
  // Sentiment Colors
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#F59E0B',
  
  // Text Colors
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
} as const;

// Sentiment Types
export const SENTIMENT_TYPES = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  NEUTRAL: 'neutral',
} as const;

// Language Codes
export const LANGUAGES = {
  ARABIC: 'AR',
  ENGLISH: 'EN',
  MIXED: 'Mixed',
} as const;

// User Roles
export const USER_ROLES = {
  SUPERVISOR: 'supervisor',
  AGENT: 'agent',
} as const;

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Model Info
export const MODEL_VERSION = 'AraBERT-v2';
export const MODEL_NAME = 'Arabic BERT for Sentiment Analysis';

// Date Formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';

// File Upload
export const ALLOWED_FILE_TYPES = ['.csv', '.xlsx', '.xls'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// API Endpoints (for future backend integration)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
  FEEDBACK: {
    LIST: '/api/feedback',
    GET: '/api/feedback/:id',
    CREATE: '/api/feedback',
    UPDATE: '/api/feedback/:id',
    DELETE: '/api/feedback/:id',
    UPLOAD: '/api/feedback/upload',
    ANALYZE: '/api/feedback/analyze',
  },
  USERS: {
    LIST: '/api/users',
    GET: '/api/users/:id',
    CREATE: '/api/users',
    UPDATE: '/api/users/:id',
    DELETE: '/api/users/:id',
  },
  REPORTS: {
    STATS: '/api/reports/stats',
    TRENDS: '/api/reports/trends',
    EXPORT: '/api/reports/export',
  },
} as const;

// Chart Configuration
export const CHART_CONFIG = {
  colors: {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#F59E0B',
  },
  height: {
    pie: 300,
    line: 250,
    bar: 250,
  },
} as const;

// Confidence Thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,
  MEDIUM: 70,
  LOW: 0,
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'egyptair_auth_token',
  USER: 'egyptair_user',
  THEME: 'egyptair_theme',
  LANGUAGE: 'egyptair_language',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  UPLOAD: '/upload',
  FEEDBACK: '/feedback',
  REPORTS: '/reports',
  USERS: '/users',
  SETTINGS: '/settings',
} as const;

// Navigation Items
export const NAV_ITEMS = [
  {
    name: 'Dashboard',
    path: 'dashboard',
    icon: 'LayoutDashboard',
    roles: ['agent', 'supervisor'],
  },
  {
    name: 'Upload Feedback',
    path: 'upload',
    icon: 'Upload',
    roles: ['agent', 'supervisor'],
  },
  {
    name: 'Feedback List',
    path: 'feedback',
    icon: 'MessageSquare',
    roles: ['agent', 'supervisor'],
  },
  {
    name: 'Reports',
    path: 'reports',
    icon: 'BarChart3',
    roles: ['agent', 'supervisor'],
  },
  {
    name: 'User Management',
    path: 'users',
    icon: 'Users',
    roles: ['supervisor'],
  },
  {
    name: 'Settings',
    path: 'settings',
    icon: 'Settings',
    roles: ['agent', 'supervisor'],
  },
] as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  FILE_SIZE: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
  FILE_TYPE: 'Invalid file type. Please upload CSV or Excel files only.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  LOGOUT: 'Successfully logged out!',
  UPLOAD: 'File uploaded successfully!',
  SAVE: 'Changes saved successfully!',
  DELETE: 'Deleted successfully!',
  EXPORT: 'Data exported successfully!',
} as const;
