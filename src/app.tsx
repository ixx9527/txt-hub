import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/use-auth';
import { Navbar } from './components/navbar';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { UploadPage } from './pages/upload';
import { BookDetailPage } from './pages/book-detail';
import { BookReaderPage } from './pages/book-reader';
import { ShelfPage } from './pages/shelf';
import { SearchPage } from './pages/search';

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
    <BrowserRouter>
      <Routes>
        {/* Reader has its own layout (no navbar) */}
        <Route path="/book/:id/read" element={<BookReaderPage />} />

        {/* Default layout with navbar */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Navbar />
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/book/:id" element={<BookDetailPage />} />
                  <Route path="/shelf" element={<ShelfPage />} />
                  <Route path="/search" element={<SearchPage />} />
                </Routes>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppContent />;
}
