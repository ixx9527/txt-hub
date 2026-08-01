import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from 'animal-island-ui';
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
    <header style={{
      background: 'var(--animal-card-default-bg)',
      borderBottom: '2px solid var(--animal-border-color)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--animal-text-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoIcon size={26} /> TXT Hub
          </span>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link to="/"><Button type="text" size="small">书架</Button></Link>
          {user && (
            <>
              <Link to="/upload"><Button type="text" size="small">上传</Button></Link>
              <Link to="/shelf"><Button type="text" size="small">我的书架</Button></Link>
            </>
          )}
        </nav>
      </div>

      <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 380 }}>
        <Input
          placeholder="搜索书籍..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          allowClear
          size="small"
          prefix={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--animal-text-secondary)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          }
        />
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {user ? (
          <>
            <span style={{ fontSize: 13, color: 'var(--animal-text-secondary)' }}>{user.username}</span>
            <Button type="text" size="small" onClick={handleLogout}>退出</Button>
          </>
        ) : (
          <>
            <Link to="/login"><Button type="text" size="small">登录</Button></Link>
            <Link to="/register"><Button type="primary" size="small">注册</Button></Link>
          </>
        )}
      </div>
    </header>
  );
}
