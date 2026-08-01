import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title, Input, Select, Button, Tag } from 'animal-island-ui';
import { api } from '../hooks/use-api';
import { CategoryTree } from '../components/category-tree';
import { BookIcon } from '../components/icons';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string | null;
  cover_path: string | null;
  file_format: string;
  created_at: string;
  categories: string[];
  tags: string[];
}

export function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', sort, order: 'desc' });
    if (search) params.set('q', search);
    if (selectedCategory) params.set('category', String(selectedCategory));

    api<{ books: Book[]; total: number }>(`/books?${params}`)
      .then((data) => { setBooks(data.books); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, sort, search, selectedCategory]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ display: 'flex', maxWidth: 1200, margin: '0 auto', padding: '24px 16px', gap: 24 }}>
      <aside style={{ width: 180, flexShrink: 0 }} className="category-sidebar">
        <Title size="small" color="app-teal">分类</Title>
        <div style={{ marginTop: 12 }}>
          <CategoryTree selectedId={selectedCategory} onSelect={(id) => { setSelectedCategory(id); setPage(1); }} />
        </div>
      </aside>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Input placeholder="搜索书名或作者..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} allowClear size="large" />
          </div>
          <Select value={sort} onChange={(v) => { setSort(v); setPage(1); }} options={[
            { label: '最新上传', key: 'created_at' },
            { label: '按书名', key: 'title' },
            { label: '按作者', key: 'author' },
          ]} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--animal-text-secondary)' }}>加载中...</div>
        ) : books.length === 0 ? (
          <Card type="dashed" style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: 'var(--animal-text-secondary)', fontSize: 16 }}>暂无书籍</p>
            <p style={{ color: 'var(--animal-text-secondary)', fontSize: 13, marginTop: 8 }}>上传第一本 EPUB 或 TXT 文件开始使用</p>
          </Card>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {books.map((book) => (
                <Link key={book.id} to={`/book/${book.id}`} style={{ textDecoration: 'none' }}>
                  <Card hoverable style={{ height: '100%' }}>
                    <div style={{ aspectRatio: '3/4', background: 'var(--animal-bg-color)', borderRadius: 12, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                      {book.cover_path ? (
                        <img src={`/uploads/${book.cover_path.split('/').pop()}`} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--animal-text-secondary)' }}><BookIcon size={40} /></div>
                      )}
                      <Tag size="small" color="app-blue" style={{ position: 'absolute', top: 8, right: 8 }}>{book.file_format.toUpperCase()}</Tag>
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--animal-text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{book.title}</h3>
                    <p style={{ fontSize: 12, color: 'var(--animal-text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>
                    {book.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {book.tags.slice(0, 2).map((tag) => <Tag key={tag} size="small" variant="outlined">{tag}</Tag>)}
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, alignItems: 'center' }}>
                <Button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</Button>
                <span style={{ fontSize: 13, color: 'var(--animal-text-secondary)' }}>{page} / {totalPages}</span>
                <Button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>下一页</Button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@media (min-width: 768px) { .category-sidebar { display: block !important; } } @media (max-width: 767px) { .category-sidebar { display: none !important; } }`}</style>
    </div>
  );
}
