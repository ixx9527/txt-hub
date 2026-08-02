import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../hooks/use-api';

interface SearchResult {
  book_id: number;
  chapter_id: string;
  chapter_title: string;
  snippet: string;
}

interface BookMatch {
  id: number;
  title: string;
  author: string;
  cover_path: string | null;
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [bookResults, setBookResults] = useState<BookMatch[]>([]);
  const [contentResults, setContentResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);

    api<{ books: BookMatch[] }>(`/books?q=${encodeURIComponent(q)}&limit=10`)
      .then((d) => setBookResults(d.books))
      .catch(() => {});

    api<{ results: SearchResult[] }>(`/books/search?q=${encodeURIComponent(q)}`)
      .then((d) => setContentResults(d.results))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <h2 className="text-lg font-bold mb-4">
        搜索结果: <span className="text-blue-600">"{q}"</span>
      </h2>

      {loading ? (
        <div className="text-center text-gray-400 py-10">搜索中...</div>
      ) : (
        <>
          {bookResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                书籍 ({bookResults.length})
              </h3>
              <div className="space-y-2">
                {bookResults.map((book) => (
                  <Link key={book.id} to={`/book/${book.id}`}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-sm">
                    <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden shrink-0">
                      {book.cover_path && (
                        <img src={`/uploads/${book.cover_path.split('uploads/')[1]}`} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{book.title}</p>
                      <p className="text-xs text-gray-500">{book.author}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {contentResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                内容匹配 ({contentResults.length})
              </h3>
              <div className="space-y-3">
                {contentResults.map((r, i) => (
                  <Link key={i} to={`/book/${r.book_id}/read?chapter=${r.chapter_id}`}
                    className="block p-3 border rounded-lg hover:shadow-sm">
                    <p className="text-sm font-medium text-blue-600 mb-1">{r.chapter_title}</p>
                    <p className="text-xs text-gray-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: r.snippet || '' }} />
                    <p className="text-xs text-gray-400 mt-1">书籍 #{r.book_id}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {bookResults.length === 0 && contentResults.length === 0 && (
            <div className="text-center text-gray-400 py-10">未找到相关结果</div>
          )}
        </>
      )}
    </div>
  );
}
