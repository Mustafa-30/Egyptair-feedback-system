import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, TrendingUp, Loader2, RefreshCw, Upload, FileText, Clock, Globe, AlertTriangle, AlertCircle, Target, Plane, CheckCircle, TrendingDown, Download, BarChart3, ArrowUpRight, ArrowDownRight, Star, Users, Settings, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line, ReferenceLine } from 'recharts';
import { analyticsApi, getAccessToken, TrendData, TopComplaint, RouteData, CsatData, ResponseTimeData, ComparisonData, NpsData, NpsHistoryData, TopRoutesResponse } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onNavigate?: (page: string, filters?: Record<string, string>) => void;
}

// Extended stats interface with new fields
interface ExtendedDashboardStats {
  total_feedback: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  pending_count: number;
  today_count: number;
  average_confidence: number;
  resolution_rate: number;
  total_change?: string;
  feedback_in_range?: number;
  language_distribution?: {
    arabic: number;
    english: number;
    total: number;
  };
  priority_distribution?: {
    high: number;
    medium: number;
    low: number;
    urgent: number;
  };
  last_updated?: string;
}

// CSAT Gauge Component
function CSATGauge({ score, grade, change }: { score: number; grade: string; change: number }) {
  const getGradeColor = () => {
    if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100' };
    if (score >= 60) return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100' };
    if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-100' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' };
  };
  
  const colors = getGradeColor();
  const circumference = 2 * Math.PI * 60;
  const strokeDasharray = (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="60" fill="none" stroke="#E5E7EB" strokeWidth="12" />
          <circle
            cx="70" cy="70" r="60" fill="none"
            stroke={score >= 80 ? '#10B981' : score >= 60 ? '#3B82F6' : score >= 40 ? '#F59E0B' : '#EF4444'}
            strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${strokeDasharray} ${circumference}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${colors.text}`}>{score}%</span>
          <span className="text-xs text-gray-500">CSAT</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.light} ${colors.text}`}>{grade}</span>
        <div className={`mt-2 text-sm flex items-center justify-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{change >= 0 ? '+' : ''}{change}% vs last period</span>
        </div>
      </div>
    </div>
  );
}

// Language Progress Bars Component
function LanguageProgressBars({ arabic, english }: { arabic: number; english: number }) {
  const total = arabic + english || 1;
  const arabicPct = Math.round((arabic / total) * 100);
  const englishPct = Math.round((english / total) * 100);
  
  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇪🇬</span>
            <span className="font-medium text-gray-700">Arabic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{arabic.toLocaleString()}</span>
            <span className="text-sm font-medium text-blue-600">{arabicPct}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500" style={{ width: `${arabicPct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇬🇧</span>
            <span className="font-medium text-gray-700">English</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{english.toLocaleString()}</span>
            <span className="text-sm font-medium text-purple-600">{englishPct}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500" style={{ width: `${englishPct}%` }} />
        </div>
      </div>
      <div className="pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Total Feedback</span>
          <span className="font-semibold text-gray-700">{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Top Complaints Component
function TopComplaints({ data, onViewAll, onCategoryClick }: { data: TopComplaint[]; onViewAll?: () => void; onCategoryClick?: (category: string) => void }) {
  const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];
  return (
    <div className="space-y-3 p-4">
      {data.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No complaint data available</p>
        </div>
      ) : (
        <>
          {data.map((item, index) => (
            <div 
              key={item.category} 
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
              onClick={() => onCategoryClick?.(item.category)}
              title={`Click to view ${item.category} feedbacks`}
            >
              <div className="w-2 h-8 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.category}</span>
                  <span className="text-sm text-gray-500">{item.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, backgroundColor: colors[index % colors.length] }} />
                </div>
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">{item.percentage}%</span>
            </div>
          ))}
          {onViewAll && (
            <button onClick={onViewAll} className="w-full mt-2 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors">
              View All Complaints →
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Response Time Card Component
function ResponseTimeCard({ data }: { data: ResponseTimeData | null }) {
  if (!data) return <div className="flex items-center justify-center h-full text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  
  const getGradeColor = () => {
    switch (data.performance_grade) {
      case 'Excellent': return 'bg-green-100 text-green-700';
      case 'Good': return 'bg-blue-100 text-blue-700';
      case 'Fair': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-red-100 text-red-700';
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Avg Response Time</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.average_response_hours < 24 ? `${data.average_response_hours} hrs` : `${data.average_response_days} days`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor()}`}>{data.performance_grade}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">{data.total_resolved}</p>
          <p className="text-xs text-gray-500">Total Resolved</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-green-600">{data.resolved_today}</p>
          <p className="text-xs text-gray-500">Today</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-blue-600">{data.resolved_this_week}</p>
          <p className="text-xs text-gray-500">This Week</p>
        </div>
      </div>
    </div>
  );
}

// NPS Score Gauge Component
function NPSGauge({ data }: { data: NpsData | null }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] text-gray-500">
        <Users className="h-12 w-12 mb-2 opacity-50" />
        <p>Loading NPS data...</p>
      </div>
    );
  }

  const { nps_score, grade, change, promoter_pct, passive_pct, detractor_pct, industry_benchmark } = data;
  
  // NPS color based on score
  const getNpsColor = (score: number) => {
    if (score >= 50) return { main: '#10B981', bg: 'bg-green-100', text: 'text-green-600' };
    if (score >= 30) return { main: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-600' };
    if (score >= 0) return { main: '#F59E0B', bg: 'bg-yellow-100', text: 'text-yellow-600' };
    return { main: '#EF4444', bg: 'bg-red-100', text: 'text-red-600' };
  };
  
  const colors = getNpsColor(nps_score);
  
  // Calculate gauge position (-100 to 100 mapped to 0-180 degrees)
  const gaugeRotation = ((nps_score + 100) / 200) * 180 - 90;
  
  return (
    <div className="flex flex-col items-center p-4">
      {/* NPS Gauge */}
      <div className="relative w-48 h-28 mb-4">
        {/* Background arc */}
        <svg className="w-full h-full" viewBox="0 0 200 110">
          {/* Background gradient arc */}
          <defs>
            <linearGradient id="npsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="65%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#npsGradient)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Industry benchmark marker */}
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="35"
            stroke="#6B7280"
            strokeWidth="2"
            transform={`rotate(${((industry_benchmark + 100) / 200) * 180 - 90}, 100, 100)`}
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            stroke={colors.main}
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${gaugeRotation}, 100, 100)`}
            className="transition-transform duration-1000"
          />
          <circle cx="100" cy="100" r="8" fill={colors.main} />
        </svg>
        {/* Score display */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
          <span className={`text-3xl font-bold ${colors.text}`}>{nps_score}</span>
          <span className="text-xs text-gray-500 block">NPS Score</span>
        </div>
      </div>
      
      {/* Labels */}
      <div className="flex justify-between w-full text-xs text-gray-400 mb-3">
        <span>-100</span>
        <span>0</span>
        <span>+100</span>
      </div>
      
      {/* Grade Badge */}
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text} mb-3`}>
        {grade}
      </span>
      
      {/* Change indicator */}
      <div className={`text-sm flex items-center gap-1 mb-4 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>{change >= 0 ? '+' : ''}{change} pts vs last period</span>
      </div>
      
      {/* Breakdown bars */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-600 font-medium">Promoters</span>
          <span>{promoter_pct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full flex overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${promoter_pct}%` }} />
          <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${passive_pct}%` }} />
          <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${detractor_pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Promoters: {promoter_pct}%</span>
          <span>Passives: {passive_pct}%</span>
          <span>Detractors: {detractor_pct}%</span>
        </div>
      </div>
    </div>
  );
}

// NPS Settings Modal Component
function NpsSettingsModal({ 
  isOpen, 
  onClose, 
  target, 
  industry, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  target: number; 
  industry: number; 
  onSave: (target: number, industry: number) => void;
}) {
  const [targetValue, setTargetValue] = useState(target);
  const [industryValue, setIndustryValue] = useState(industry);

  useEffect(() => {
    setTargetValue(target);
    setIndustryValue(industry);
  }, [target, industry, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">NPS Score Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target NPS Score
            </label>
            <input
              type="number"
              min="-100"
              max="100"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Your organization's target NPS score (-100 to 100)</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry Benchmark
            </label>
            <input
              type="number"
              min="-100"
              max="100"
              value={industryValue}
              onChange={(e) => setIndustryValue(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Average NPS for your industry (-100 to 100)</p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(targetValue, industryValue);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom dot component for NPS chart - shows green/red based on target, gray for insufficient data
interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { nps: number | null; month: string; status: string; has_sufficient_data: boolean; has_data?: boolean };
  targetNps: number;
}

function NpsCustomDot({ cx, cy, payload, targetNps }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;
  
  // Handle no data for this month - hollow circle with dashed border
  if (payload.has_data === false) {
    return (
      <g>
        {/* Hollow circle for no data */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill="white" 
          stroke="#D1D5DB" 
          strokeWidth={2} 
          strokeDasharray="3 2"
        />
        {/* X mark to indicate no data */}
        <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} stroke="#9CA3AF" strokeWidth={1.5} />
        <line x1={cx + 3} y1={cy - 3} x2={cx - 3} y2={cy + 3} stroke="#9CA3AF" strokeWidth={1.5} />
      </g>
    );
  }
  
  // Handle insufficient data (some data but below threshold)
  if (payload.nps === null || !payload.has_sufficient_data) {
    return (
      <g>
        {/* Amber/yellow dot for insufficient data */}
        <circle cx={cx} cy={cy} r={8} fill="#F59E0B" opacity={0.2} />
        <circle cx={cx} cy={cy} r={5} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={2} />
        {/* Question mark indicator */}
        <text x={cx} y={cy + 3} textAnchor="middle" fill="#D97706" fontSize={8} fontWeight="bold">?</text>
      </g>
    );
  }
  
  const isAboveTarget = payload.nps >= targetNps;
  const fillColor = isAboveTarget ? '#10B981' : '#EF4444';
  const strokeColor = isAboveTarget ? '#059669' : '#DC2626';
  
  return (
    <g>
      {/* Outer glow effect */}
      <circle cx={cx} cy={cy} r={10} fill={fillColor} opacity={0.2} />
      {/* Main dot */}
      <circle cx={cx} cy={cy} r={6} fill={fillColor} stroke={strokeColor} strokeWidth={2} />
      {/* Arrow indicator */}
      {isAboveTarget ? (
        <polygon 
          points={`${cx},${cy - 16} ${cx - 4},${cy - 10} ${cx + 4},${cy - 10}`} 
          fill={fillColor} 
        />
      ) : (
        <polygon 
          points={`${cx},${cy + 16} ${cx - 4},${cy + 10} ${cx + 4},${cy + 10}`} 
          fill={fillColor} 
        />
      )}
    </g>
  );
}

// Custom tooltip for NPS chart
interface NpsTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { 
    month: string; 
    nps: number | null; 
    total_responses: number; 
    promoters: number; 
    detractors: number; 
    passives?: number;
    promoters_pct?: number;
    detractors_pct?: number;
    has_sufficient_data: boolean;
    has_data?: boolean;
    status: string 
  } }>;
  targetNps: number;
}

function NpsCustomTooltip({ active, payload, targetNps }: NpsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0].payload;
  
  // Handle no data for this month
  if (data.has_data === false || (data.nps === null && data.total_responses === 0)) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 border-dashed">
        <p className="font-semibold text-gray-800 text-lg mb-2">{data.month}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-gray-100">
            <AlertCircle className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-500">No Data Available</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            No feedback was collected during this month
          </p>
        </div>
      </div>
    );
  }
  
  // Handle insufficient data (some data but below threshold)
  if (!data.has_sufficient_data) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-800 text-lg mb-2">{data.month}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-amber-600">Insufficient Data</span>
          </div>
          <div className="text-sm text-gray-500">
            <p>Only {data.total_responses} response{data.total_responses !== 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-400">(Minimum 5 required for reliable NPS)</p>
            {data.nps !== null && (
              <p className="mt-1 text-amber-600">Preliminary NPS: {data.nps}</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const isAboveTarget = data.nps !== null && data.nps >= targetNps;
  const diff = data.nps !== null ? data.nps - targetNps : 0;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-800 text-lg mb-2">{data.month}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">NPS Score:</span>
          <span className={`font-bold text-xl ${isAboveTarget ? 'text-green-600' : 'text-red-600'}`}>
            {data.nps}
          </span>
        </div>
        <div className={`flex items-center gap-2 px-2 py-1 rounded ${isAboveTarget ? 'bg-green-50' : 'bg-red-50'}`}>
          {isAboveTarget ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          <span className={`font-medium ${isAboveTarget ? 'text-green-700' : 'text-red-700'}`}>
            {isAboveTarget ? 'Above Target' : 'Below Target'} ({diff > 0 ? '+' : ''}{diff})
          </span>
        </div>
        <div className="border-t border-gray-100 pt-2 mt-2 text-sm text-gray-500">
          <p>Responses: {data.total_responses}</p>
          <p>Promoters: {data.promoters} ({data.promoters_pct?.toFixed(1) ?? 0}%)</p>
          <p>Detractors: {data.detractors} ({data.detractors_pct?.toFixed(1) ?? 0}%)</p>
          {data.passives !== undefined && <p>Passives: {data.passives}</p>}
        </div>
      </div>
    </div>
  );
}

// NPS History Line Chart with custom target/industry - Enhanced version
function NPSHistoryChart({ data, customTarget, customIndustry }: { data: NpsHistoryData | null; customTarget?: number; customIndustry?: number }) {
  if (!data || data.history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
        <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
        <p>No NPS history available</p>
      </div>
    );
  }

  const targetNps = customTarget ?? data.target_nps;
  const industryBenchmark = customIndustry ?? data.industry_benchmark;

  // Enhance data with status for tooltip - handle null NPS values and no data
  const enhancedHistory = data.history.map(item => ({
    ...item,
    // Use null for chart gaps, but provide display value for rendering
    displayNps: item.nps,
    status: item.has_data === false 
      ? 'no-data'
      : (item.nps !== null && item.has_sufficient_data 
        ? (item.nps >= targetNps ? 'above' : 'below') 
        : 'insufficient'),
    target: targetNps,
    industry: industryBenchmark
  }));

  // Filter only valid NPS values for calculations (has sufficient data)
  const validValues = enhancedHistory
    .filter(h => h.nps !== null && h.has_sufficient_data && h.has_data !== false)
    .map(h => h.nps as number);

  // Count months with no data
  const monthsWithNoData = enhancedHistory.filter(h => h.has_data === false).length;

  // Calculate min/max for better Y-axis scaling
  const allNpsValues = validValues.length > 0 ? validValues : [0];
  const minNps = Math.min(...allNpsValues, targetNps, industryBenchmark);
  const maxNps = Math.max(...allNpsValues, targetNps, industryBenchmark);
  const yMin = Math.max(-100, Math.floor(minNps / 10) * 10 - 20);
  const yMax = Math.min(100, Math.ceil(maxNps / 10) * 10 + 20);

  // Create gradient colors for the line based on target
  const gradientOffset = () => {
    if (validValues.length === 0) return 0.5;
    const dataMax = Math.max(...validValues);
    const dataMin = Math.min(...validValues);
    
    if (dataMax <= targetNps) return 0;
    if (dataMin >= targetNps) return 1;
    
    return (targetNps - dataMin) / (dataMax - dataMin);
  };

  const off = gradientOffset();

  // Use summary from API if available, otherwise calculate
  const summary = data.summary || {
    avg_nps: validValues.length > 0 ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length) : null,
    max_nps: validValues.length > 0 ? Math.max(...validValues) : null,
    min_nps: validValues.length > 0 ? Math.min(...validValues) : null,
    months_above_target: validValues.filter(v => v >= targetNps).length,
    total_months: data.history.length,
    months_with_data: validValues.length
  };

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex justify-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">Above Target</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <span className="text-sm text-gray-600">Below Target</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-500" />
          <span className="text-sm text-gray-600">Insufficient Data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white border-2 border-dashed border-gray-300" />
          <span className="text-sm text-gray-600">No Data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500" style={{ borderTop: '2px dashed #10B981' }} />
          <span className="text-sm text-gray-600">Target: {targetNps}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-gray-400" style={{ borderTop: '2px dashed #9CA3AF' }} />
          <span className="text-sm text-gray-600">Industry: {industryBenchmark}</span>
        </div>
      </div>

      {/* Warning if many months have no data */}
      {monthsWithNoData > 0 && (
        <div className="flex items-center justify-center gap-2 mb-2 text-sm text-amber-600 bg-amber-50 py-1 px-3 rounded-full mx-auto w-fit">
          <AlertCircle className="h-4 w-4" />
          <span>{monthsWithNoData} month{monthsWithNoData !== 1 ? 's' : ''} with no feedback data</span>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={enhancedHistory} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
          <defs>
            {/* Gradient for line - green above target, red below */}
            <linearGradient id="npsLineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="#10B981" stopOpacity={1} />
              <stop offset={off} stopColor="#10B981" stopOpacity={1} />
              <stop offset={off} stopColor="#EF4444" stopOpacity={1} />
              <stop offset={1} stopColor="#EF4444" stopOpacity={1} />
            </linearGradient>
            {/* Area gradient */}
            <linearGradient id="npsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis 
            dataKey="month" 
            stroke="#6B7280" 
            fontSize={12} 
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            domain={[yMin, yMax]} 
            stroke="#6B7280" 
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={(value) => `${value}`}
          />
          
          <Tooltip content={<NpsCustomTooltip targetNps={targetNps} />} />
          
          {/* Target line - prominent */}
          <ReferenceLine 
            y={targetNps} 
            stroke="#10B981" 
            strokeWidth={2}
            strokeDasharray="8 4" 
            label={{ 
              value: `Target: ${targetNps}`, 
              fill: '#10B981', 
              fontSize: 12,
              fontWeight: 'bold',
              position: 'right'
            }} 
          />
          
          {/* Industry benchmark line */}
          <ReferenceLine 
            y={industryBenchmark} 
            stroke="#9CA3AF" 
            strokeWidth={1}
            strokeDasharray="4 4" 
            label={{ 
              value: `Industry: ${industryBenchmark}`, 
              fill: '#9CA3AF', 
              fontSize: 11,
              position: 'right'
            }} 
          />
          
          {/* Area under the line for visual emphasis */}
          <Area
            type="monotone"
            dataKey="nps"
            stroke="none"
            fill="url(#npsAreaGradient)"
            connectNulls={false}
          />
          
          {/* Main NPS line with gradient coloring */}
          <Line
            type="monotone"
            dataKey="nps"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={(props: CustomDotProps) => <NpsCustomDot {...props} targetNps={targetNps} />}
            activeDot={{ r: 10, fill: '#3B82F6', stroke: '#1D4ED8', strokeWidth: 2 }}
            name="NPS Score"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Summary stats below chart */}
      <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-sm text-gray-500">Avg NPS</p>
          <p className="text-xl font-bold text-blue-600">
            {summary.avg_nps !== null ? summary.avg_nps : 'N/A'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Best Month</p>
          <p className="text-xl font-bold text-green-600">
            {summary.max_nps !== null ? summary.max_nps : 'N/A'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Worst Month</p>
          <p className="text-xl font-bold text-red-600">
            {summary.min_nps !== null ? summary.min_nps : 'N/A'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Months Above Target</p>
          <p className="text-xl font-bold text-green-600">
            {summary.months_above_target}/{summary.months_with_data}
          </p>
        </div>
      </div>
    </div>
  );
}

// Enhanced Top Routes Chart with ratings and ranking methodology
function TopRoutesChart({ data }: { data: TopRoutesResponse | null }) {
  if (!data || !data.routes || data.routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
        <Plane className="h-12 w-12 mb-2 opacity-50" />
        <p>No route data available</p>
      </div>
    );
  }

  const { routes, ranking_method, ranking_description, min_reviews_threshold } = data;

  // Get confidence badge color
  const getConfidenceBadge = (confidence?: 'high' | 'medium' | 'low' | 'none', meetsThreshold?: boolean) => {
    if (!meetsThreshold) {
      return { color: 'bg-gray-100 text-gray-500', icon: AlertCircle, label: 'Low sample' };
    }
    switch (confidence) {
      case 'high': return { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'High confidence' };
      case 'medium': return { color: 'bg-blue-100 text-blue-600', icon: TrendingUp, label: 'Medium confidence' };
      case 'low': return { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, label: 'Low confidence' };
      default: return { color: 'bg-gray-100 text-gray-500', icon: AlertCircle, label: 'Insufficient data' };
    }
  };

  // Get ranking method label
  const getRankingLabel = () => {
    switch (ranking_method) {
      case 'weighted': return 'Wilson Score (statistically weighted)';
      case 'rating': return 'Highest Rated';
      case 'volume': return 'Most Reviewed';
      default: return 'Ranked';
    }
  };

  return (
    <div className="space-y-3">
      {/* Ranking methodology info */}
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
        <BarChart3 className="h-4 w-4" />
        <span className="font-medium">{getRankingLabel()}</span>
        {min_reviews_threshold > 0 && (
          <span className="text-blue-600">• Min {min_reviews_threshold} reviews required</span>
        )}
      </div>
      
      {routes.slice(0, 8).map((route, index) => {
        const rating = route.avg_rating || 0;
        const positivePct = route.positive_pct || (route.total > 0 ? (route.positive / route.total) * 100 : 0);
        const confidenceBadge = getConfidenceBadge(route.confidence, route.meets_threshold);
        const ConfidenceIcon = confidenceBadge.icon;
        
        // Color based on rating
        const getRatingColor = (r: number) => {
          if (r >= 4) return 'text-green-600';
          if (r >= 3) return 'text-blue-600';
          if (r >= 2) return 'text-yellow-600';
          return 'text-red-600';
        };

        return (
          <div key={route.route} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${route.meets_threshold ? 'hover:bg-gray-50' : 'hover:bg-gray-50 opacity-75'}`}>
            {/* Rank */}
            <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
              index === 0 ? 'bg-yellow-100 text-yellow-700' :
              index === 1 ? 'bg-gray-100 text-gray-600' :
              index === 2 ? 'bg-orange-100 text-orange-700' :
              'bg-gray-50 text-gray-500'
            }`}>
              {index + 1}
            </div>
            
            {/* Route info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-gray-800 truncate">{route.route}</span>
                {/* Confidence indicator */}
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${confidenceBadge.color}`} title={confidenceBadge.label}>
                  <ConfidenceIcon className="h-3 w-3" />
                </span>
              </div>
              <div className="text-xs text-gray-500">{route.total} reviews</div>
            </div>
            
            {/* Rating */}
            <div className="text-right">
              <div className={`flex items-center gap-1 ${getRatingColor(rating)}`}>
                <Star className="h-4 w-4 fill-current" />
                <span className="font-bold">{rating.toFixed(1)}</span>
              </div>
              <div className="text-xs text-gray-500">{positivePct.toFixed(0)}% positive</div>
            </div>
            
            {/* Mini sentiment bar */}
            <div className="w-24 h-2 bg-gray-100 rounded-full flex overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${(route.positive / route.total) * 100}%` }} />
              <div className="h-full bg-yellow-400" style={{ width: `${(route.neutral / route.total) * 100}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${(route.negative / route.total) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Feedback by Route Chart (keep for backward compatibility)
function FeedbackByRouteChart({ data }: { data: RouteData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
        <Plane className="h-12 w-12 mb-2 opacity-50" />
        <p>No route data available</p>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data.slice(0, 8)} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis type="number" stroke="#6B7280" fontSize={12} />
        <YAxis type="category" dataKey="route" stroke="#6B7280" fontSize={11} width={70} />
        <Tooltip formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]} contentStyle={{ borderRadius: '8px' }} />
        <Legend />
        <Bar dataKey="positive" stackId="a" fill="#10B981" name="Positive" />
        <Bar dataKey="neutral" stackId="a" fill="#F59E0B" name="Neutral" />
        <Bar dataKey="negative" stackId="a" fill="#EF4444" name="Negative" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [stats, setStats] = useState<ExtendedDashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [topComplaints, setTopComplaints] = useState<TopComplaint[]>([]);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [csatData, setCsatData] = useState<CsatData | null>(null);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [npsData, setNpsData] = useState<NpsData | null>(null);
  const [npsHistory, setNpsHistory] = useState<NpsHistoryData | null>(null);
  const [topRoutesData, setTopRoutesData] = useState<TopRoutesResponse | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // NPS Settings state
  const [showNpsSettings, setShowNpsSettings] = useState(false);
  const [npsTargetOverride, setNpsTargetOverride] = useState<number | null>(null);
  const [npsIndustryOverride, setNpsIndustryOverride] = useState<number | null>(null);
  
  // Refs for chart export
  const sentimentChartRef = useRef<HTMLDivElement>(null);
  const trendsChartRef = useRef<HTMLDivElement>(null);
  const npsChartRef = useRef<HTMLDivElement>(null);

  // Fetch dashboard data
  const fetchData = useCallback(async (showRefreshing = false) => {
    const token = getAccessToken();
    if (!token) {
      console.log('No token available');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Build query params for filters
      // Only send days parameter if we have no custom date range
      // If no filters at all, we get all data (show_all behavior)
      const statsParams: Record<string, string> = {};
      const hasDateFilter = Boolean(dateRange.from || dateRange.to);
      
      if (dateRange.from) {
        statsParams.date_from = dateRange.from;
      }
      if (dateRange.to) {
        statsParams.date_to = dateRange.to;
      }
      // Only use days filter if no custom date range specified
      if (!hasDateFilter) {
        // No date filters - get all data
        statsParams.show_all = 'true';
      }
      if (sentimentFilter !== 'all') statsParams.sentiment = sentimentFilter;

      // Build common filter params for all endpoints
      const dateFilterParams = hasDateFilter 
        ? { date_from: dateRange.from, date_to: dateRange.to } 
        : { show_all: true };

      // Fetch all data in parallel - pass date filters to all endpoints
      const [statsData, trendsData, complaintsData, routesData, csatResult, responseData, comparisonResult, npsResult, npsHistoryResult, topRoutesResult] = await Promise.all([
        analyticsApi.getStats(statsParams).catch(() => null),
        analyticsApi.getTrends({ days: 30, ...dateFilterParams }).catch(() => []),
        analyticsApi.getTopComplaints({ limit: 5, date_from: dateRange.from, date_to: dateRange.to }).catch(() => []),
        analyticsApi.getFeedbackByRoute({ limit: 8, date_from: dateRange.from, date_to: dateRange.to }).catch(() => []),
        analyticsApi.getCsatScore(hasDateFilter ? { date_from: dateRange.from, date_to: dateRange.to } : { show_all: true }).catch(() => null),
        analyticsApi.getResponseTime().catch(() => null),
        analyticsApi.getComparison({ days: 30, date_from: dateRange.from, date_to: dateRange.to }).catch(() => null),
        analyticsApi.getNpsScore(hasDateFilter ? { date_from: dateRange.from, date_to: dateRange.to } : { show_all: true }).catch(() => null),
        analyticsApi.getNpsHistory({ months: 6, date_from: dateRange.from, date_to: dateRange.to }).catch(() => null),
        analyticsApi.getTopRoutes({ limit: 10, date_from: dateRange.from, date_to: dateRange.to }).catch(() => ({ routes: [], ranking_method: 'weighted' as const, ranking_description: '', min_reviews_threshold: 5, total_routes_analyzed: 0 })),
      ]);

      if (statsData) {
        setStats(statsData as ExtendedDashboardStats);
      }
      console.log('Trends data received:', trendsData);
      setTrends(trendsData);
      setTopComplaints(complaintsData);
      setRouteData(routesData);
      setCsatData(csatResult);
      setResponseTimeData(responseData);
      setComparisonData(comparisonResult);
      setNpsData(npsResult);
      setNpsHistory(npsHistoryResult);
      setTopRoutesData(topRoutesResult);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange.from, dateRange.to, sentimentFilter]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Handle filter apply
  const handleApplyFilters = () => {
    fetchData();
  };

  // Handle filter clear
  const handleClearFilters = () => {
    setDateRange({ from: '', to: '' });
    setSentimentFilter('all');
    // Fetch with cleared filters
    setTimeout(() => fetchData(), 0);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchData(true);
  };

  // Handle card click for drill-down
  const handleCardClick = (sentiment?: string) => {
    if (onNavigate) {
      const filters: Record<string, string> = {};
      if (sentiment) filters.sentiment = sentiment;
      onNavigate('feedback', filters);
    }
  };

  // Quick action handlers
  const handleUploadClick = () => {
    if (onNavigate) onNavigate('upload');
  };

  const handleReportsClick = () => {
    if (onNavigate) onNavigate('reports');
  };

  const handleViewComplaints = () => {
    if (onNavigate) onNavigate('feedback', { sentiment: 'negative' });
  };

  // Handle category click from Top Complaints
  const handleCategoryClick = (category: string) => {
    if (onNavigate) onNavigate('feedback', { sentiment: 'negative', category: category });
  };

  // Handle NPS settings save
  const handleNpsSettingsSave = (target: number, industry: number) => {
    setNpsTargetOverride(target);
    setNpsIndustryOverride(industry);
    // Save to localStorage for persistence
    localStorage.setItem('nps_target', String(target));
    localStorage.setItem('nps_industry', String(industry));
  };

  // Load NPS settings from localStorage on mount
  useEffect(() => {
    const savedTarget = localStorage.getItem('nps_target');
    const savedIndustry = localStorage.getItem('nps_industry');
    if (savedTarget) setNpsTargetOverride(Number(savedTarget));
    if (savedIndustry) setNpsIndustryOverride(Number(savedIndustry));
  }, []);

  // Export chart as image
  const exportChartAsImage = async (chartRef: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!chartRef.current) return;
    
    try {
      // Use html2canvas dynamically - fallback to simpler method if not available
      const element = chartRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Get SVG element from Recharts
      const svg = element.querySelector('svg');
      if (svg && ctx) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    } catch (err) {
      console.error('Error exporting chart:', err);
    }
  };

  // Use API stats - show zeros when no data
  const displayStats = {
    total_feedback: stats?.total_feedback ?? 0,
    positive_count: stats?.positive_count ?? 0,
    negative_count: stats?.negative_count ?? 0,
    neutral_count: stats?.neutral_count ?? 0,
    pending_count: stats?.pending_count ?? 0,
    today_count: stats?.today_count ?? 0,
    average_confidence: stats?.average_confidence ?? 0,
    resolution_rate: stats?.resolution_rate ?? 0,
    total_change: stats?.total_change ?? '0%',
  };

  const total = displayStats.positive_count + displayStats.negative_count + displayStats.neutral_count || 1;
  const positivePercentage = Math.round((displayStats.positive_count / total) * 100);
  const negativePercentage = Math.round((displayStats.negative_count / total) * 100);
  const neutralPercentage = Math.round((displayStats.neutral_count / total) * 100);

  const pieData = [
    { name: 'Positive', value: displayStats.positive_count, color: '#10B981' },
    { name: 'Negative', value: displayStats.negative_count, color: '#EF4444' },
    { name: 'Neutral', value: displayStats.neutral_count, color: '#F59E0B' },
  ];

  const displayTrends = trends;

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Page Title with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Dashboard</h1>
          <p className="text-[#6B7280]">Overview of feedback analysis and sentiment trends</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastUpdated && (
            <div className="flex items-center gap-1 text-sm text-[#6B7280]">
              <Clock className="h-4 w-4" />
              <span>{formatLastUpdated()}</span>
            </div>
          )}
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}
          >
            {autoRefresh ? '● Live' : '○ Paused'}
          </button>
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-[#003366] hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleUploadClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-md hover:bg-[#002244] transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Feedback
        </button>
        <button
          onClick={handleReportsClick}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Generate Report
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
          <span className="ml-2 text-[#6B7280]">Loading dashboard data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-red-800 flex-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Feedback */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
              onClick={() => handleCardClick()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#6B7280] mb-2">Total Feedback</p>
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{displayStats.total_feedback.toLocaleString()}</h2>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">{displayStats.today_count} today</span>
                    {displayStats.total_change && (
                      <span className={`text-xs ml-1 ${displayStats.total_change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        ({displayStats.total_change})
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Positive Feedback */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg hover:border-green-300 transition-all"
              onClick={() => handleCardClick('positive')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#6B7280] mb-2">Positive Feedback</p>
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{displayStats.positive_count.toLocaleString()}</h2>
                  <span className="text-green-600 text-sm">{positivePercentage}% Positive</span>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Negative Feedback */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg hover:border-red-300 transition-all"
              onClick={() => handleCardClick('negative')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#6B7280] mb-2">Negative Feedback</p>
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{displayStats.negative_count.toLocaleString()}</h2>
                  <span className="text-red-600 text-sm">{negativePercentage}% Negative</span>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <ThumbsDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Neutral Feedback */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg hover:border-amber-300 transition-all"
              onClick={() => handleCardClick('neutral')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#6B7280] mb-2">Neutral Feedback</p>
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{displayStats.neutral_count.toLocaleString()}</h2>
                  <span className="text-amber-600 text-sm">{neutralPercentage}% Neutral</span>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Minus className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards Row 2 - CSAT, Response Time, Pending, Resolution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CSAT Score Gauge */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Customer Satisfaction</h3>
                </div>
              </div>
              {csatData ? (
                <CSATGauge score={csatData.csat_score} grade={csatData.grade} change={csatData.change} />
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>

            {/* Response Time */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Response Performance</h3>
                </div>
              </div>
              <ResponseTimeCard data={responseTimeData} />
            </div>

            {/* Pending */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide">Pending Review</p>
                  <p className="text-2xl font-bold text-[#1F2937] mt-1">{displayStats.pending_count}</p>
                  <p className="text-sm text-orange-600 mt-1">Awaiting action</p>
                </div>
                <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center">
                  <Clock className="h-7 w-7 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Resolution Rate */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wide">Resolution Rate</p>
                  <p className="text-2xl font-bold text-[#1F2937] mt-1">{displayStats.resolution_rate}%</p>
                  <p className="text-sm text-green-600 mt-1">Issues resolved</p>
                </div>
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-[#1F2937]">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-[#1F2937]">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-[#1F2937]">Sentiment</label>
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="w-full h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button 
                  onClick={handleApplyFilters}
                  className="flex-1 h-10 px-4 bg-[#003366] text-white rounded-md hover:bg-[#002244] transition-colors"
                >
                  Apply Filters
                </button>
                <button 
                  onClick={handleClearFilters}
                  className="h-10 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-[#6B7280] mr-2">Quick:</span>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setDateRange({ from: today, to: today });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setDateRange({
                    from: weekAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setDateRange({
                    from: monthAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setDateRange({
                    from: firstDay.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                This Month
              </button>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200" ref={sentimentChartRef}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1F2937]">Sentiment Distribution</h3>
                  <p className="text-sm text-[#6B7280]">
                    {dateRange.from && dateRange.to 
                      ? `${dateRange.from} to ${dateRange.to}` 
                      : 'Last 30 Days'}
                  </p>
                </div>
              </div>
              {displayStats.total_feedback === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-[#6B7280]">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                  <p>No feedback data available</p>
                  <button
                    onClick={handleUploadClick}
                    className="mt-3 text-sm text-[#003366] hover:underline"
                  >
                    Upload feedback to get started
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* NPS Score Tracker - Replaces Sentiment Trends */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200" ref={npsChartRef}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1F2937]">NPS Score Tracker</h3>
                  <p className="text-sm text-[#6B7280]">Net Promoter Score trend over months</p>
                </div>
                <button
                  onClick={() => setShowNpsSettings(true)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Target & Industry Values"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
              <NPSHistoryChart 
                data={npsHistory} 
                customTarget={npsTargetOverride ?? undefined}
                customIndustry={npsIndustryOverride ?? undefined}
              />
            </div>
          </div>

          {/* Charts Row 2 - NPS Gauge & Top Routes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NPS Score Gauge */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-[#1F2937]">Net Promoter Score</h3>
                </div>
                <p className="text-sm text-[#6B7280] mt-1">Customer loyalty indicator (last 30 days)</p>
              </div>
              <NPSGauge data={npsData} />
            </div>

            {/* Top Routes with Ratings */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-[#1F2937]">Top Routes by Feedback</h3>
                </div>
                <p className="text-sm text-[#6B7280] mt-1">Routes ranked by Wilson Score (balances rating & volume)</p>
              </div>
              <div className="p-4 max-h-[350px] overflow-y-auto">
                <TopRoutesChart data={topRoutesData} />
              </div>
            </div>
          </div>

          {/* Charts Row 3 - Language Distribution & Top Complaints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language Distribution - Progress Bars */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-[#1F2937]">Language Distribution</h3>
                </div>
                <p className="text-sm text-[#6B7280] mt-1">Arabic vs English feedback</p>
              </div>
              <LanguageProgressBars 
                arabic={stats?.language_distribution?.arabic || 0}
                english={stats?.language_distribution?.english || 0}
              />
            </div>

            {/* Top Complaints */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-[#1F2937]">Top Complaint Categories</h3>
                </div>
                <p className="text-sm text-[#6B7280] mt-1">Most common issues from negative feedback</p>
              </div>
              <TopComplaints data={topComplaints} onViewAll={handleViewComplaints} onCategoryClick={handleCategoryClick} />
            </div>
          </div>


        </>
      )}

      {/* NPS Settings Modal */}
      <NpsSettingsModal
        isOpen={showNpsSettings}
        onClose={() => setShowNpsSettings(false)}
        onSave={handleNpsSettingsSave}
        currentTarget={npsTargetOverride ?? 50}
        currentIndustry={npsIndustryOverride ?? 32}
      />
    </div>
  );
}
