import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Button, Drawer } from 'animal-island-ui';
import { api } from '../hooks/use-api';
import { useAuth } from '../hooks/use-auth';

interface Chapter { id: string; title: string; content: string; }
interface BookInfo { id: number; title: string; author: string; chapters: { id: string; title: string; sort_order: number }[]; }
interface Bookmark { id: number; chapter_id: string; note: string | null; created_at: string; }
interface Highlight { id: number; chapter_id: string; text: string; color: string; note: string | null; created_at: string; }
interface ReaderSettings { fontSize: number; lineHeight: number; theme: 'light' | 'sepia' | 'dark'; }

const DEFAULT_SETTINGS: ReaderSettings = { fontSize: 16, lineHeight: 1.8, theme: 'light' };
const THEME_STYLES: Record<string, { bg: string; text: string }> = {
  light: { bg: '#fff', text: '#4a3728' },
  sepia: { bg: '#f5f0e0', text: '#5c4b37' },
  dark: { bg: '#2c2416', text: '#d4c5a9' },
};
const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange'];
const COLOR_HEX: Record<string, string> = { yellow: '#fde047', green: '#86efac', blue: '#93c5fd', pink: '#f9a8d4', orange: '#fdba74' };

export function BookReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();

  const [book, setBook] = useState<BookInfo | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectionMenu, setSelectionMenu] = useState<{ text: string; x: number; y: number } | null>(null);
  const [highlightColor, setHighlightColor] = useState('yellow');
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('reader-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const chapters = book?.chapters || [];

  useEffect(() => {
    api<BookInfo>(`/books/${id}`).then((data) => {
      setBook(data);
      const targetChapter = searchParams.get('chapter');
      const idx = targetChapter ? data.chapters.findIndex((c) => c.id === targetChapter) : 0;
      setChapterIndex(idx >= 0 ? idx : 0);
    });
  }, [id, searchParams]);

  useEffect(() => {
    if (!book || chapters.length === 0) return;
    const ch = chapters[chapterIndex];
    if (!ch) return;
    api<Chapter>(`/reader/${id}/chapters/${ch.id}`).then(setChapter).catch(console.error);
  }, [book, chapterIndex, id, chapters]);

  useEffect(() => {
    if (!token || !id) return;
    api<{ bookmarks: Bookmark[] }>(`/reader/${id}/bookmarks`, { token }).then((d) => setBookmarks(d.bookmarks)).catch(() => {});
    api<{ highlights: Highlight[] }>(`/reader/${id}/highlights`, { token }).then((d) => setHighlights(d.highlights)).catch(() => {});
  }, [token, id]);

  const updateSettings = useCallback((partial: Partial<ReaderSettings>) => {
    setSettings((prev) => { const next = { ...prev, ...partial }; localStorage.setItem('reader-settings', JSON.stringify(next)); return next; });
  }, []);

  useEffect(() => {
    if (!token || !book || chapters.length === 0) return;
    api(`/shelf/${book.id}/progress`, { method: 'PUT', body: { progress: (chapterIndex + 1) / chapters.length, status: 'reading' }, token }).catch(() => {});
  }, [chapterIndex, book, token, id, chapters.length]);

  const goNext = () => setChapterIndex((i) => Math.min(chapters.length - 1, i + 1));
  const goPrev = () => setChapterIndex((i) => Math.max(0, i - 1));
  const goToChapter = (idx: number) => { setChapterIndex(idx); setTocOpen(false); };

  const currentChapterId = chapters[chapterIndex]?.id;
  const isBookmarked = bookmarks.some((b) => b.chapter_id === currentChapterId);

  const toggleBookmark = async () => {
    if (!token || !id || !currentChapterId) return;
    const existing = bookmarks.find((b) => b.chapter_id === currentChapterId);
    if (existing) {
      await api(`/reader/${id}/bookmarks/${existing.id}`, { method: 'DELETE', token });
      setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
    } else {
      await api(`/reader/${id}/bookmarks`, { method: 'POST', body: { chapter_id: currentChapterId }, token });
      setBookmarks((prev) => [...prev, { id: Date.now(), chapter_id: currentChapterId, note: null, created_at: new Date().toISOString() }]);
    }
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) return;
    const text = selection.toString().trim();
    if (!text || text.length < 2) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current.getBoundingClientRect();
    setSelectionMenu({ text, x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top - 10 });
  };

  const addHighlight = async () => {
    if (!token || !id || !selectionMenu || !currentChapterId) return;
    await api(`/reader/${id}/highlights`, { method: 'POST', body: { chapter_id: currentChapterId, text: selectionMenu.text, color: highlightColor }, token });
    setHighlights((prev) => [...prev, { id: Date.now(), chapter_id: currentChapterId, text: selectionMenu!.text, color: highlightColor, note: null, created_at: new Date().toISOString() }]);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const deleteHighlight = async (hlId: number) => {
    if (!token || !id) return;
    await api(`/reader/${id}/highlights/${hlId}`, { method: 'DELETE', token });
    setHighlights((prev) => prev.filter((h) => h.id !== hlId));
  };

  const theme = THEME_STYLES[settings.theme];

  if (!book) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: theme.bg, color: theme.text }}>加载中...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg, color: theme.text }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: `1px solid ${settings.theme === 'dark' ? '#4a3f2f' : '#e0d5c0'}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to={`/book/${id}`} style={{ textDecoration: 'none', color: theme.text, fontSize: 14 }}>← 返回</Link>
          <Button type="text" size="small" onClick={() => setTocOpen(true)}>目录</Button>
          {user && (
            <>
              <Button type="text" size="small" onClick={() => setBookmarksOpen(true)}>书签</Button>
              <Button type="text" size="small" onClick={() => setHighlightsOpen(true)}>笔记</Button>
            </>
          )}
        </div>
        <div style={{ fontSize: 13, opacity: 0.6, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chapters[chapterIndex]?.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && <Button type="text" size="small" onClick={toggleBookmark} style={{ color: isBookmarked ? '#f7cd67' : undefined, fontSize: 18 }}>{isBookmarked ? '★' : '☆'}</Button>}
          <span style={{ fontSize: 12, opacity: 0.5 }}>{chapterIndex + 1}/{chapters.length}</span>
          <Button type="text" size="small" onClick={() => setSettingsOpen(true)}>设置</Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }} onClick={() => setSelectionMenu(null)}>
        <div ref={contentRef} style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px', position: 'relative' }} onMouseUp={handleMouseUp}>
          {chapter ? (
            <>
              <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 32 }}>{chapter.title}</h2>
              <div style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight, whiteSpace: 'pre-wrap', userSelect: 'text' }}>{chapter.content}</div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>加载章节中...</div>
          )}

          {selectionMenu && (
            <div style={{ position: 'absolute', zIndex: 20, background: '#fff', border: '2px solid var(--animal-border-color)', borderRadius: 16, padding: 8, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', left: selectionMenu.x, top: selectionMenu.y, transform: 'translate(-50%, -100%)' }}
              onClick={(e) => e.stopPropagation()}>
              {HIGHLIGHT_COLORS.map((c) => (
                <button key={c} onClick={() => setHighlightColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${highlightColor === c ? '#725d42' : 'transparent'}`, background: COLOR_HEX[c], cursor: 'pointer' }} />
              ))}
              <Button type="primary" size="small" onClick={addHighlight}>标记</Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderTop: `1px solid ${settings.theme === 'dark' ? '#4a3f2f' : '#e0d5c0'}`, flexShrink: 0 }}>
        <Button disabled={chapterIndex === 0} onClick={goPrev}>← 上一章</Button>
        <div style={{ width: 180, height: 6, background: settings.theme === 'dark' ? '#4a3f2f' : '#e0d5c0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--animal-primary-color)', borderRadius: 3, transition: 'width 0.3s', width: `${((chapterIndex + 1) / chapters.length) * 100}%` }} />
        </div>
        <Button disabled={chapterIndex === chapters.length - 1} onClick={goNext}>下一章 →</Button>
      </div>

      {/* TOC Drawer */}
      <Drawer open={tocOpen} title="目录" placement="left" width={320} onClose={() => setTocOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {chapters.map((ch, idx) => (
            <Button key={ch.id} type={idx === chapterIndex ? 'primary' : 'text'} size="small" block
              style={{ textAlign: 'left', justifyContent: 'flex-start', fontWeight: idx === chapterIndex ? 600 : 400 }}
              onClick={() => goToChapter(idx)}>
              {ch.title}
            </Button>
          ))}
        </div>
      </Drawer>

      {/* Settings Drawer */}
      <Drawer open={settingsOpen} title="阅读设置" placement="right" width={280} onClose={() => setSettingsOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 13, color: 'var(--animal-text-secondary)', display: 'block', marginBottom: 8 }}>字体大小: {settings.fontSize}px</label>
            <input type="range" min="12" max="28" value={settings.fontSize} onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--animal-text-secondary)', display: 'block', marginBottom: 8 }}>行距: {settings.lineHeight}</label>
            <input type="range" min="1.2" max="3" step="0.1" value={settings.lineHeight} onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--animal-text-secondary)', display: 'block', marginBottom: 8 }}>主题</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['light', 'sepia', 'dark'] as const).map((t) => (
                <Button key={t} type={settings.theme === t ? 'primary' : 'default'} size="small" onClick={() => updateSettings({ theme: t })}>
                  {t === 'light' ? '白天' : t === 'sepia' ? '护眼' : '夜间'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Bookmarks Drawer */}
      <Drawer open={bookmarksOpen} title={`书签 (${bookmarks.length})`} placement="left" width={320} onClose={() => setBookmarksOpen(false)}>
        {bookmarks.length === 0 ? (
          <p style={{ color: 'var(--animal-text-secondary)', textAlign: 'center', padding: 24 }}>暂无书签，点击 ☆ 添加</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookmarks.map((bm) => {
              const chIdx = chapters.findIndex((c) => c.id === bm.chapter_id);
              return (
                <Button key={bm.id} type="text" block style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => { if (chIdx >= 0) goToChapter(chIdx); }}>
                  <span style={{ color: '#f7cd67', marginRight: 6 }}>★</span>
                  {chapters[chIdx]?.title || '未知章节'}
                </Button>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* Highlights Drawer */}
      <Drawer open={highlightsOpen} title={`笔记与高亮 (${highlights.length})`} placement="right" width={320} onClose={() => setHighlightsOpen(false)}>
        {highlights.length === 0 ? (
          <p style={{ color: 'var(--animal-text-secondary)', textAlign: 'center', padding: 24 }}>选中文本后可添加高亮</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {highlights.map((hl) => (
              <div key={hl.id} style={{ padding: 10, background: 'var(--animal-bg-color)', borderRadius: 12, borderLeft: `4px solid ${COLOR_HEX[hl.color] || '#fde047'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ fontSize: 13, flex: 1 }}>{hl.text.length > 80 ? hl.text.slice(0, 80) + '...' : hl.text}</p>
                  <button onClick={() => deleteHighlight(hl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--animal-text-secondary)', fontSize: 14 }}>×</button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--animal-text-secondary)', marginTop: 4, display: 'block' }}>
                  {chapters.find((c) => c.id === hl.chapter_id)?.title} · {new Date(hl.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
