import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Cursor, Footer } from 'animal-island-ui';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--animal-bg-color)' }}>
        <p style={{ color: 'var(--animal-text-color)', fontSize: 18 }}>加载中...</p>
      </div>
    );
  }

  return (
    <Cursor>
      <BrowserRouter>
        <Routes>
          <Route path="/book/:id/read" element={<BookReaderPage />} />
          <Route
            path="*"
            element={
              <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--animal-bg-color)' }}>
                <Navbar />
                <div style={{ flex: 1 }}>
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
                <Footer type="sea" />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </Cursor>
  );
}

export default function App() {
  return <AppContent />;
}
