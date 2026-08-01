import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, Title } from 'animal-island-ui';
import { api } from '../hooks/use-api';

interface SearchResult { book_id: number; chapter_id: string; chapter_title: string; snippet: string; }
interface BookMatch { id: number; title: string; author: string; cover_path: string | null; }

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [bookResults, setBookResults] = useState<BookMatch[]>([]);
  const [contentResults, setContentResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    api<{ books: BookMatch[] }>(`/books?q=${encodeURIComponent(q)}&limit=10`).then((d) => setBookResults(d.books)).catch(() => {});
    api<{ results: SearchResult[] }>(`/books/search?q=${encodeURIComponent(q)}`).then((d) => setContentResults(d.results)).catch(() => {}).finally(() => setLoading(false));
  }, [q]);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      <Title size="large" color="app-yellow">搜索结果</Title>
      <p style={{ fontSize: 14, color: 'var(--animal-text-secondary)', marginTop: 8 }}>关键词: "{q}"</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--animal-text-secondary)' }}>搜索中...</div>
      ) : (
        <>
          {bookResults.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Title size="small" color="app-blue">书籍 ({bookResults.length})</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {bookResults.map((book) => (
                  <Link key={book.id} to={`/book/${book.id}`} style={{ textDecoration: 'none' }}>
                    <Card hoverable>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 56, background: 'var(--animal-bg-color)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                          {book.cover_path && <img src={`/uploads/${book.cover_path.split('/').pop()}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--animal-text-color)' }}>{book.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--animal-text-secondary)' }}>{book.author}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {contentResults.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Title size="small" color="app-teal">内容匹配 ({contentResults.length})</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {contentResults.map((r, i) => (
                  <Link key={i} to={`/book/${r.book_id}/read?chapter=${r.chapter_id}`} style={{ textDecoration: 'none' }}>
                    <Card hoverable>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--animal-primary-color)' }}>{r.chapter_title}</p>
                      <p style={{ fontSize: 12, color: 'var(--animal-text-color)', marginTop: 4 }} dangerouslySetInnerHTML={{ __html: r.snippet || '' }} />
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {bookResults.length === 0 && contentResults.length === 0 && (
            <Card type="dashed" style={{ textAlign: 'center', padding: 40, marginTop: 24 }}>
              <p style={{ color: 'var(--animal-text-secondary)' }}>未找到相关结果</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
