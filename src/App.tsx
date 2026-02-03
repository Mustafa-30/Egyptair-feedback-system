import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { UploadFeedback } from './components/UploadFeedback';
import { FeedbackList } from './components/FeedbackList';
import { FeedbackDetailModal } from './components/FeedbackDetailModal';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { Settings } from './components/Settings';
import { Feedback } from './types';

// Apply saved appearance settings on load
const applyAppearanceSettings = () => {
  try {
    const stored = localStorage.getItem('egyptair_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      const root = document.documentElement;
      
      // Apply theme
      if (settings.theme === 'dark') {
        root.classList.add('dark');
        document.body.classList.add('dark-mode');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark-mode');
      }
      
      // Apply compact view
      if (settings.compactView) {
        root.classList.add('compact');
        document.body.classList.add('compact-mode');
      } else {
        root.classList.remove('compact');
        document.body.classList.remove('compact-mode');
      }
    }
  } catch (e) {
    console.error('Failed to apply appearance settings:', e);
  }
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [pageFilters, setPageFilters] = useState<Record<string, string>>({});

  // Apply appearance settings on mount
  useEffect(() => {
    applyAppearanceSettings();
    
    // Listen for storage changes (when settings are saved)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'egyptair_settings') {
        applyAppearanceSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003366] via-[#004488] to-[#0055AA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
  };

  const handleCloseFeedbackModal = () => {
    setSelectedFeedback(null);
  };

  // Handle navigation with optional filters
  const handleNavigate = (page: string, filters?: Record<string, string>) => {
    setCurrentPage(page);
    setPageFilters(filters || {});
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard key="dashboard" onNavigate={handleNavigate} />;
      case 'upload':
        return <UploadFeedback key="upload" onNavigate={handleNavigate} />;
      case 'feedback':
        return <FeedbackList key="feedback" onViewFeedback={handleViewFeedback} initialFilters={pageFilters} />;
      case 'reports':
        return <Reports key="reports" />;
      case 'users':
        return <UserManagement key="users" />;
      case 'settings':
        return <Settings key="settings" />;
      default:
        return <Dashboard key="dashboard-default" onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
      </Layout>
      <FeedbackDetailModal 
        feedback={selectedFeedback} 
        onClose={handleCloseFeedbackModal} 
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
