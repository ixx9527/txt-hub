import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/use-auth';
import { DialogProvider } from './components/dialog';
import { Navbar } from './components/navbar';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { UploadPage } from './pages/upload';
import { BookDetailPage } from './pages/book-detail';
import { BookReaderPage } from './pages/book-reader';
import { SearchPage } from './pages/search';
import { TxtToEpubPage } from './pages/txt-to-epub';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { checkAuth, loading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <DialogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/book/:id/read" element={<RequireAuth><BookReaderPage /></RequireAuth>} />
          <Route
            path="*"
            element={
              <div className="min-h-screen flex flex-col bg-gray-50">
                <Navbar />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Routes>
                    <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
                    <Route path="/book/:id" element={<RequireAuth><BookDetailPage /></RequireAuth>} />
                    <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
                    <Route path="/txt-to-epub" element={<RequireAuth><TxtToEpubPage /></RequireAuth>} />
                  </Routes>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </DialogProvider>
  );
}

export default function App() {
  return <AppContent />;
}
