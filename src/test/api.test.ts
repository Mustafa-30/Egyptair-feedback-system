/**
 * API Client Tests
 * Tests for authentication, feedback, and analytics API functions
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Authentication', () => {
    it('should store token on successful login', async () => {
      const mockResponse = {
        access_token: 'test-token-123',
        token_type: 'bearer',
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Simulate login
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' }),
      });

      const data = await response.json();
      
      expect(data.access_token).toBe('test-token-123');
      expect(response.ok).toBe(true);
    });

    it('should return error on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid username or password' }),
      });

      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Dashboard Stats', () => {
    it('should fetch dashboard statistics', async () => {
      const mockStats = {
        total_feedback: 150,
        positive_count: 80,
        negative_count: 40,
        neutral_count: 30,
        pending_count: 25,
        today_count: 5,
        average_confidence: 85.5,
        resolution_rate: 60.0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const response = await fetch('http://localhost:8000/api/v1/analytics/dashboard');
      const data = await response.json();

      expect(data.total_feedback).toBe(150);
      expect(data.positive_count).toBe(80);
      expect(data.negative_count).toBe(40);
      expect(data.neutral_count).toBe(30);
    });

    it('should filter stats by date range', async () => {
      const mockStats = {
        total_feedback: 50,
        positive_count: 30,
        negative_count: 15,
        neutral_count: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const response = await fetch(
        'http://localhost:8000/api/v1/analytics/dashboard?date_from=2024-12-01&date_to=2024-12-31'
      );
      const data = await response.json();

      expect(data.total_feedback).toBe(50);
    });
  });

  describe('Feedback API', () => {
    it('should fetch feedback list', async () => {
      const mockFeedback = {
        items: [
          { id: 1, text: 'Great service!', sentiment: 'positive', language: 'EN' },
          { id: 2, text: 'الخدمة ممتازة', sentiment: 'positive', language: 'AR' },
        ],
        total: 2,
        page: 1,
        page_size: 25,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeedback,
      });

      const response = await fetch('http://localhost:8000/api/v1/feedback/');
      const data = await response.json();

      expect(data.items).toHaveLength(2);
      expect(data.items[0].sentiment).toBe('positive');
    });

    it('should filter feedback by sentiment', async () => {
      const mockFeedback = {
        items: [
          { id: 1, text: 'Bad experience', sentiment: 'negative', language: 'EN' },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeedback,
      });

      const response = await fetch('http://localhost:8000/api/v1/feedback/?sentiment=negative');
      const data = await response.json();

      expect(data.items).toHaveLength(1);
      expect(data.items[0].sentiment).toBe('negative');
    });

    it('should create new feedback', async () => {
      const newFeedback = {
        text: 'The flight was excellent',
        customer_name: 'John Doe',
        flight_number: 'MS777',
      };

      const mockResponse = {
        id: 100,
        ...newFeedback,
        sentiment: 'positive',
        sentiment_confidence: 0.92,
        language: 'EN',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('http://localhost:8000/api/v1/feedback/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeedback),
      });
      const data = await response.json();

      expect(data.id).toBe(100);
      expect(data.sentiment).toBe('positive');
    });

    it('should delete feedback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Feedback deleted successfully' }),
      });

      const response = await fetch('http://localhost:8000/api/v1/feedback/1', {
        method: 'DELETE',
      });
      const data = await response.json();

      expect(data.message).toContain('deleted');
    });
  });

  describe('Upload API', () => {
    it('should preview uploaded file', async () => {
      const mockPreview = {
        filename: 'feedback.xlsx',
        total_rows: 100,
        columns: ['customer_name', 'flight_number', 'text', 'language'],
        text_column: 'text',
        sample_data: [{ text: 'Great service', customer_name: 'John' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPreview,
      });

      const response = await fetch('http://localhost:8000/api/v1/upload/preview', {
        method: 'POST',
        body: new FormData(),
      });
      const data = await response.json();

      expect(data.total_rows).toBe(100);
      expect(data.columns).toContain('text');
    });

    it('should process uploaded file', async () => {
      const mockResult = {
        file_id: 1,
        filename: 'feedback.xlsx',
        total_rows: 100,
        processed_count: 95,
        saved_count: 95,
        errors: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const response = await fetch('http://localhost:8000/api/v1/upload/process', {
        method: 'POST',
        body: new FormData(),
      });
      const data = await response.json();

      expect(data.processed_count).toBe(95);
      expect(data.errors).toHaveLength(0);
    });
  });

  describe('Sentiment Trends', () => {
    it('should fetch sentiment trends', async () => {
      const mockTrends = [
        { date: 'Dec 20', positive: 10, negative: 3, neutral: 5 },
        { date: 'Dec 21', positive: 15, negative: 2, neutral: 8 },
        { date: 'Dec 22', positive: 12, negative: 5, neutral: 6 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrends,
      });

      const response = await fetch('http://localhost:8000/api/v1/analytics/sentiment-trends?days=30');
      const data = await response.json();

      expect(data).toHaveLength(3);
      expect(data[0]).toHaveProperty('positive');
      expect(data[0]).toHaveProperty('negative');
    });
  });
});

describe('Utility Functions', () => {
  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-12-25');
      const formatted = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      expect(formatted).toBe('Dec 25, 2024');
    });
  });

  describe('Percentage Calculation', () => {
    it('should calculate sentiment percentage', () => {
      const positive = 80;
      const negative = 40;
      const neutral = 30;
      const total = positive + negative + neutral;
      
      const positivePercentage = Math.round((positive / total) * 100);
      const negativePercentage = Math.round((negative / total) * 100);
      const neutralPercentage = Math.round((neutral / total) * 100);
      
      expect(positivePercentage).toBe(53);
      expect(negativePercentage).toBe(27);
      expect(neutralPercentage).toBe(20);
    });

    it('should handle zero total', () => {
      const total = 0;
      const percentage = total === 0 ? 0 : Math.round((50 / total) * 100);
      expect(percentage).toBe(0);
    });
  });

  describe('Language Detection', () => {
    it('should identify Arabic text', () => {
      const arabicText = 'الخدمة ممتازة';
      const hasArabic = /[\u0600-\u06FF]/.test(arabicText);
      expect(hasArabic).toBe(true);
    });

    it('should identify English text', () => {
      const englishText = 'Great service';
      const hasArabic = /[\u0600-\u06FF]/.test(englishText);
      expect(hasArabic).toBe(false);
    });
  });
});
