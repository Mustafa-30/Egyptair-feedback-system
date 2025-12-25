import { useState } from 'react';
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

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onViewFeedback={handleViewFeedback} onNavigate={setCurrentPage} />;
      case 'upload':
        return <UploadFeedback onNavigate={setCurrentPage} />;
      case 'feedback':
        return <FeedbackList onViewFeedback={handleViewFeedback} />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onViewFeedback={handleViewFeedback} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
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
