import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../hooks/use-api';
import { useAuth } from '../hooks/use-auth';
import { BookIcon } from '../components/icons';
import { useDialog } from '../components/dialog';

interface BookDetail {
  id: number;
  title: string;
  author: string;
  publisher: string | null;
  description: string | null;
  language: string;
  isbn: string | null;
  cover_path: string | null;
  file_format: string;
  file_size: number;
  upload_user_id: number | null;
  created_at: string;
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  chapters: { id: string; title: string; sort_order: number; level: number }[];
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ title: '', author: '', publisher: '', description: '', language: '', isbn: '' });
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();

  useEffect(() => {
    api<BookDetail>(`/books/${id}`)
      .then(setBook)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddShelf = async () => {
    if (!token || !book) return;
    try {
      await api('/shelf', { method: 'POST', body: { book_id: book.id }, token });
      await dialog.alert({ message: '已加入书架', type: 'success' });
    } catch (err) {
      await dialog.alert({ message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!token || !book) return;
    const confirmed = await dialog.confirm({ title: '删除书籍', message: `确定要删除《${book.title}》吗？此操作不可恢复。`, type: 'warning', confirmText: '删除' });
    if (!confirmed) return;
    try {
      await api(`/books/${book.id}`, { method: 'DELETE', token });
      navigate('/');
    } catch (err) {
      await dialog.alert({ message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const handleSaveEdit = async () => {
    if (!token || !book) return;
    try {
      await api(`/books/${book.id}`, { method: 'PUT', body: editData, token });
      setBook({ ...book, ...editData });
      setEditing(false);
    } catch (err) {
      await dialog.alert({ message: err instanceof Error ? err.message : '保存失败', type: 'error' });
    }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;
  if (!book) return <div className="text-center text-gray-400 py-20">书籍不存在</div>;

  const canEdit = user && (user.id === book.upload_user_id || user.role === 'admin');

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="flex gap-8">
        <div className="w-48 shrink-0">
          <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
            {book.cover_path ? (
              <img
                src={`/uploads/${book.cover_path.split('uploads/')[1]}`}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <BookIcon size={64} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          {editing ? (
            <div className="space-y-3">
              <input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full border rounded px-3 py-2 text-lg font-bold"
                placeholder="书名"
              />
              <input
                value={editData.author}
                onChange={(e) => setEditData({ ...editData, author: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="作者"
              />
              <input
                value={editData.publisher}
                onChange={(e) => setEditData({ ...editData, publisher: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="出版社"
              />
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm h-24"
                placeholder="简介"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">保存</button>
                <button onClick={() => setEditing(false)} className="border px-4 py-1.5 rounded text-sm">取消</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-800">{book.title}</h1>
              <p className="text-gray-600 mt-1">{book.author}</p>
              {book.publisher && <p className="text-sm text-gray-500 mt-1">{book.publisher}</p>}

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Link
                  to={`/book/${book.id}/read`}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  开始阅读
                </Link>
                {user && (
                  <button onClick={handleAddShelf} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                    加入书架
                  </button>
                )}
                <a
                  href={`/api/books/${book.id}/download?format=${book.file_format}`}
                  className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  下载 {book.file_format.toUpperCase()}
                </a>
                {book.file_format === 'epub' && (
                  <a
                    href={`/api/books/${book.id}/download?format=txt`}
                    className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    下载 TXT
                  </a>
                )}
                {canEdit && (
                  <>
                    <button onClick={() => { setEditing(true); setEditData({ title: book.title, author: book.author, publisher: book.publisher || '', description: book.description || '', language: book.language, isbn: book.isbn || '' }); }} className="text-sm text-gray-500 hover:text-blue-600">
                      编辑
                    </button>
                    <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">
                      删除
                    </button>
                  </>
                )}
              </div>

              {book.description && (
                <p className="text-sm text-gray-600 mt-4 leading-relaxed">{book.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {book.categories.map((c) => (
                  <span key={c.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{c.name}</span>
                ))}
                {book.tags.map((t) => (
                  <span key={t.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">#{t.name}</span>
                ))}
              </div>

              <div className="text-xs text-gray-400 mt-4 space-x-4">
                <span>格式: {book.file_format.toUpperCase()}</span>
                <span>大小: {(book.file_size / 1024 / 1024).toFixed(2)} MB</span>
                <span>语言: {book.language}</span>
                <span>上传于: {new Date(book.created_at).toLocaleDateString()}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {book.chapters.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            目录 ({book.chapters.length} 章)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
            {book.chapters.map((ch) => (
              <Link
                key={ch.id}
                to={`/book/${book.id}/read?chapter=${ch.id}`}
                className={`text-sm py-1.5 px-2 rounded hover:bg-gray-50 truncate block ${
                  ch.level === 1 ? 'font-semibold text-gray-800 sm:col-span-2' :
                  ch.level === 2 ? 'text-gray-600 pl-6' :
                  'text-gray-500 pl-6'
                } hover:text-blue-600`}
              >
                {ch.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
