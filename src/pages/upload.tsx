import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Title, Button } from 'animal-island-ui';
import { useAuth } from '../hooks/use-auth';
import { apiUpload } from '../hooks/use-api';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && /\.(epub|txt)$/i.test(f.name)) setFile(f);
    else setError('仅支持 EPUB 和 TXT 文件');
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiUpload('/books/upload', formData, token) as { id: number };
      navigate(`/book/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '40px 16px' }}>
      <Title size="large" color="app-orange">上传书籍</Title>

      {error && <div style={{ background: '#fff0f0', color: '#d32f2f', padding: '10px 14px', borderRadius: 12, fontSize: 13, marginTop: 16 }}>{error}</div>}

      <Card type="dashed" style={{ marginTop: 24, cursor: 'pointer', textAlign: 'center', padding: '48px 24px', borderColor: dragging ? 'var(--animal-primary-color)' : undefined, background: dragging ? 'var(--animal-primary-bg)' : undefined }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept=".epub,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} style={{ display: 'none' }} />
        <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
        {file ? (
          <>
            <p style={{ fontWeight: 600, color: 'var(--animal-text-color)' }}>{file.name}</p>
            <p style={{ fontSize: 13, color: 'var(--animal-text-secondary)', marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--animal-text-color)', fontSize: 15 }}>拖拽文件到此处，或点击选择</p>
            <p style={{ fontSize: 13, color: 'var(--animal-text-secondary)', marginTop: 4 }}>支持 EPUB、TXT 格式，最大 100MB</p>
          </>
        )}
      </Card>

      {file && (
        <Button type="primary" block size="large" loading={uploading} onClick={handleUpload} style={{ marginTop: 16 }}>
          {uploading ? '上传中...' : '上传'}
        </Button>
      )}
    </div>
  );
}
