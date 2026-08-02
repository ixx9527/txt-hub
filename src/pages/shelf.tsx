import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../hooks/use-api';
import { useAuth } from '../hooks/use-auth';
import { BookIcon, CloseIcon } from '../components/icons';
import { useDialog } from '../components/dialog';

interface ShelfBook {
  id: number;
  title: string;
  author: string;
  cover_path: string | null;
  file_format: string;
  status: string;
  progress: number;
  last_read_at: string | null;
  added_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  want: '想读',
  reading: '在读',
  finished: '读过',
};

export function ShelfPage() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const { token } = useAuth();
  const dialog = useDialog();

  useEffect(() => {
    if (!token) return;
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api<{ books: ShelfBook[] }>(`/shelf${params}`, { token })
      .then((data) => setBooks(data.books))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  const handleRemove = async (bookId: number) => {
    if (!token) return;
    const confirmed = await dialog.confirm({ message: '确定移出书架？', type: 'confirm', confirmText: '移出' });
    if (!confirmed) return;
    try {
      await api(`/shelf/${bookId}`, { method: 'DELETE', token });
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch (err) {
      await dialog.alert({ message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">我的书架</h2>
        <div className="flex gap-2">
          {['', 'reading', 'finished', 'want'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-sm ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s ? STATUS_LABELS[s] : '全部'}
            </button>
          ))}
        </div>
      </div>

      {books.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <p>书架是空的</p>
          <Link to="/" className="text-blue-600 text-sm hover:underline mt-2 inline-block">去浏览书籍</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <div key={book.id} className="flex items-center gap-4 border rounded-lg p-3 hover:shadow-sm">
              <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden shrink-0">
                {book.cover_path ? (
                  <img src={`/uploads/${book.cover_path.split('uploads/')[1]}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <BookIcon size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/book/${book.id}`} className="font-medium text-sm text-gray-800 hover:text-blue-600 truncate block">
                  {book.title}
                </Link>
                <p className="text-xs text-gray-500">{book.author}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  book.status === 'reading' ? 'bg-green-100 text-green-700' :
                  book.status === 'finished' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {STATUS_LABELS[book.status] || book.status}
                </span>
                {book.progress > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{Math.round(book.progress * 100)}%</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(book.id)}
                className="text-gray-400 hover:text-red-500"
                title="移出书架"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
