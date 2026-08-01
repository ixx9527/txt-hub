import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Title, Input, Button, Tag, Modal, Divider } from 'animal-island-ui';
import { api } from '../hooks/use-api';
import { useAuth } from '../hooks/use-auth';

interface BookDetail {
  id: number; title: string; author: string; publisher: string | null;
  description: string | null; language: string; isbn: string | null;
  cover_path: string | null; file_format: string; file_size: number;
  upload_user_id: number | null; created_at: string;
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  chapters: { id: string; title: string; sort_order: number }[];
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ title: '', author: '', publisher: '', description: '', language: '', isbn: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api<BookDetail>(`/books/${id}`).then(setBook).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleAddShelf = async () => {
    if (!token || !book) return;
    try { await api('/shelf', { method: 'POST', body: { book_id: book.id }, token }); alert('已加入书架'); }
    catch (err) { alert(err instanceof Error ? err.message : '操作失败'); }
  };

  const handleDelete = async () => {
    if (!token || !book) return;
    try { await api(`/books/${book.id}`, { method: 'DELETE', token }); navigate('/'); }
    catch (err) { alert(err instanceof Error ? err.message : '删除失败'); }
    setDeleteOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!token || !book) return;
    try { await api(`/books/${book.id}`, { method: 'PUT', body: editData, token }); setBook({ ...book, ...editData }); setEditing(false); }
    catch (err) { alert(err instanceof Error ? err.message : '保存失败'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--animal-text-secondary)' }}>加载中...</div>;
  if (!book) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--animal-text-secondary)' }}>书籍不存在</div>;

  const canEdit = user && (user.id === book.upload_user_id || user.role === 'admin');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Cover */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '3/4', background: 'var(--animal-bg-color)' }}>
              {book.cover_path ? (
                <img src={`/uploads/${book.cover_path.split('/').pop()}`} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>📖</div>
              )}
            </div>
          </Card>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {editing ? (
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} placeholder="书名" />
                <Input value={editData.author} onChange={(e) => setEditData({ ...editData, author: e.target.value })} placeholder="作者" />
                <Input value={editData.publisher} onChange={(e) => setEditData({ ...editData, publisher: e.target.value })} placeholder="出版社" />
                <textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} placeholder="简介"
                  style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 12, border: '2px solid var(--animal-border-color)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="primary" onClick={handleSaveEdit}>保存</Button>
                  <Button onClick={() => setEditing(false)}>取消</Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Title size="large" color="app-blue">{book.title}</Title>
              <p style={{ fontSize: 16, color: 'var(--animal-text-color)', marginTop: 12 }}>{book.author}</p>
              {book.publisher && <p style={{ fontSize: 13, color: 'var(--animal-text-secondary)', marginTop: 4 }}>{book.publisher}</p>}

              <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link to={`/book/${book.id}/read`}><Button type="primary" size="large">开始阅读</Button></Link>
                {user && <Button onClick={handleAddShelf}>加入书架</Button>}
                <a href={`/api/books/${book.id}/download?format=${book.file_format}`} style={{ textDecoration: 'none' }}>
                  <Button>下载 {book.file_format.toUpperCase()}</Button>
                </a>
                {book.file_format === 'epub' && (
                  <a href={`/api/books/${book.id}/download?format=txt`} style={{ textDecoration: 'none' }}>
                    <Button>下载 TXT</Button>
                  </a>
                )}
                {canEdit && (
                  <>
                    <Button type="text" onClick={() => { setEditing(true); setEditData({ title: book.title, author: book.author, publisher: book.publisher || '', description: book.description || '', language: book.language, isbn: book.isbn || '' }); }}>编辑</Button>
                    <Button type="text" danger onClick={() => setDeleteOpen(true)}>删除</Button>
                  </>
                )}
              </div>

              {book.description && <p style={{ fontSize: 14, color: 'var(--animal-text-color)', marginTop: 20, lineHeight: 1.8 }}>{book.description}</p>}

              <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
                {book.categories.map((c) => <Tag key={c.id} color="app-teal">{c.name}</Tag>)}
                {book.tags.map((t) => <Tag key={t.id} variant="outlined">#{t.name}</Tag>)}
              </div>

              <div style={{ fontSize: 12, color: 'var(--animal-text-secondary)', marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
        <>
          <Divider type="wave-yellow" />
          <Title size="middle" color="app-yellow">目录 ({book.chapters.length} 章)</Title>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 4, marginTop: 16 }}>
            {book.chapters.map((ch) => (
              <Link key={ch.id} to={`/book/${book.id}/read?chapter=${ch.id}`} style={{ textDecoration: 'none' }}>
                <Card hoverable style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: 13, color: 'var(--animal-text-color)' }}>{ch.title}</span>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <Modal open={deleteOpen} title="确认删除" onClose={() => setDeleteOpen(false)}
        footer={<><Button onClick={() => setDeleteOpen(false)}>取消</Button><Button type="primary" danger onClick={handleDelete}>删除</Button></>}>
        确定要删除《{book.title}》吗？此操作不可恢复。
      </Modal>
    </div>
  );
}
