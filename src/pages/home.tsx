import { useState, useEffect } from 'react';
import { api } from '../hooks/use-api';
import { BookCard } from '../components/book-card';
import { CategoryTree } from '../components/category-tree';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string | null;
  cover_path: string | null;
  file_format: string;
  file_size: number;
  language: string;
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
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      sort,
      order: 'desc',
    });
    if (search) params.set('q', search);
    if (selectedCategory) params.set('category', String(selectedCategory));

    api<{ books: Book[]; total: number }>(`/books?${params}`)
      .then((data) => {
        setBooks(data.books);
        setTotal(data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, sort, search, selectedCategory]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex max-w-7xl mx-auto">
      <aside className="w-48 shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto hidden md:block">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">分类</h3>
        <CategoryTree selectedId={selectedCategory} onSelect={(id) => { setSelectedCategory(id); setPage(1); }} />
      </aside>

      <div className="flex-1 px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索书名或作者..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="created_at">最新上传</option>
            <option value="title">按书名</option>
            <option value="author">按作者</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20">加载中...</div>
        ) : books.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <p>暂无书籍</p>
            <p className="text-sm mt-2">上传第一本 EPUB 或 TXT 文件开始使用</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} {...book} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
