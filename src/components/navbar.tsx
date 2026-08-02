import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { LogoIcon } from './icons';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-800 hover:text-blue-600 shrink-0">
          <LogoIcon size={24} /> TXT Hub
        </Link>
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link to="/" className="text-gray-600 hover:text-blue-600">书库</Link>
          {user && (
            <>
              <Link to="/txt-to-epub" className="text-gray-600 hover:text-blue-600">制书</Link>
              <Link to="/upload" className="text-gray-600 hover:text-blue-600">上传</Link>
              <Link to="/shelf" className="text-gray-600 hover:text-blue-600">我的书架</Link>
            </>
          )}
        </nav>
      </div>

      <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索书籍..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 pl-8 text-sm focus:outline-none focus:border-blue-400"
          />
          <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
      </form>

      <div className="flex items-center gap-4 text-sm shrink-0">
        {user ? (
          <>
            <span className="text-gray-500 hidden sm:inline">{user.username}</span>
            <button onClick={handleLogout} className="text-gray-600 hover:text-red-600">退出</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-600 hover:text-blue-600">登录</Link>
            <Link to="/register" className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">注册</Link>
          </>
        )}
      </div>
    </header>
  );
}
