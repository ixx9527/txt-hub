import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title, Button, Tag } from 'animal-island-ui';
import { api } from '../hooks/use-api';
import { useAuth } from '../hooks/use-auth';

interface ShelfBook {
  id: number; title: string; author: string; cover_path: string | null;
  file_format: string; status: string; progress: number;
  last_read_at: string | null; added_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  want: { label: '想读', color: 'default' },
  reading: { label: '在读', color: 'app-green' },
  finished: { label: '读过', color: 'app-blue' },
};

export function ShelfPage() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api<{ books: ShelfBook[] }>(`/shelf${params}`, { token })
      .then((data) => setBooks(data.books))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  const handleRemove = async (bookId: number) => {
    if (!token || !confirm('确定移出书架？')) return;
    try { await api(`/shelf/${bookId}`, { method: 'DELETE', token }); setBooks((prev) => prev.filter((b) => b.id !== bookId)); }
    catch (err) { alert(err instanceof Error ? err.message : '操作失败'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--animal-text-secondary)' }}>加载中...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Title size="large" color="app-teal">我的书架</Title>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ v: '', l: '全部' }, { v: 'reading', l: '在读' }, { v: 'finished', l: '读过' }, { v: 'want', l: '想读' }].map(({ v, l }) => (
            <Button key={v} type={statusFilter === v ? 'primary' : 'default'} size="small" onClick={() => setStatusFilter(v)}>{l}</Button>
          ))}
        </div>
      </div>

      {books.length === 0 ? (
        <Card type="dashed" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--animal-text-secondary)' }}>书架是空的</p>
          <Link to="/" style={{ color: 'var(--animal-primary-color)', fontSize: 13 }}>去浏览书籍</Link>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {books.map((book) => (
            <Card key={book.id} hoverable>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 64, background: 'var(--animal-bg-color)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  {book.cover_path ? (
                    <img src={`/uploads/${book.cover_path.split('/').pop()}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📖</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/book/${book.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--animal-text-color)', textDecoration: 'none' }}>{book.title}</Link>
                  <p style={{ fontSize: 12, color: 'var(--animal-text-secondary)', marginTop: 2 }}>{book.author}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Tag color={(STATUS_MAP[book.status]?.color || 'default') as any}>{STATUS_MAP[book.status]?.label || book.status}</Tag>
                  {book.progress > 0 && <p style={{ fontSize: 11, color: 'var(--animal-text-secondary)', marginTop: 4 }}>{Math.round(book.progress * 100)}%</p>}
                </div>
                <Button type="text" size="small" danger onClick={() => handleRemove(book.id)}>✕</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
