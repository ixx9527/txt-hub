import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../hooks/use-api';
import { useAuth } from '../hooks/use-auth';
import { BookmarkIcon } from '../components/icons';

interface Chapter {
  id: string;
  title: string;
  content: string;
}

interface BookInfo {
  id: number;
  title: string;
  author: string;
  chapters: { id: string; title: string; sort_order: number; level: number }[];
  last_chapter_id: string | null;
}

interface Bookmark {
  id: number;
  chapter_id: string;
  note: string | null;
  created_at: string;
}

interface Highlight {
  id: number;
  chapter_id: string;
  text: string;
  color: string;
  note: string | null;
  created_at: string;
}

interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  theme: 'light' | 'sepia' | 'dark';
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  lineHeight: 1.8,
  theme: 'light',
};

const THEME_STYLES: Record<string, { bg: string; text: string; sidebar: string; border: string }> = {
  light: { bg: 'bg-white', text: 'text-gray-800', sidebar: 'bg-gray-50', border: 'border-gray-200' },
  sepia: { bg: 'bg-amber-50', text: 'text-amber-900', sidebar: 'bg-amber-100', border: 'border-amber-200' },
  dark: { bg: 'bg-gray-900', text: 'text-gray-200', sidebar: 'bg-gray-800', border: 'border-gray-700' },
};

const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange'];

export function BookReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();

  const [book, setBook] = useState<BookInfo | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
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
    api<BookInfo>(`/books/${id}`, { token }).then((data) => {
      setBook(data);
      const targetChapter = searchParams.get('chapter');
      let idx = targetChapter ? data.chapters.findIndex((c) => c.id === targetChapter) : -1;
      if (idx < 0 && data.last_chapter_id) {
        idx = data.chapters.findIndex((c) => c.id === data.last_chapter_id);
      }
      setChapterIndex(idx >= 0 ? idx : 0);
    });
  }, [id, searchParams, token]);

  useEffect(() => {
    if (!book || chapters.length === 0) return;
    const ch = chapters[chapterIndex];
    if (!ch) return;
    api<Chapter>(`/reader/${id}/chapters/${ch.id}`)
      .then(setChapter)
      .catch(console.error);
  }, [book, chapterIndex, id, chapters]);

  useEffect(() => {
    if (!token || !id) return;
    api<{ bookmarks: Bookmark[] }>(`/reader/${id}/bookmarks`, { token })
      .then((d) => setBookmarks(d.bookmarks))
      .catch(() => {});
    api<{ highlights: Highlight[] }>(`/reader/${id}/highlights`, { token })
      .then((d) => setHighlights(d.highlights))
      .catch(() => {});
  }, [token, id]);

  const updateSettings = useCallback((partial: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('reader-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!token || !book || chapters.length === 0) return;
    const ch = chapters[chapterIndex];
    if (!ch) return;
    const progress = (chapterIndex + 1) / chapters.length;
    api(`/shelf/${book.id}/progress`, {
      method: 'PUT', body: { progress, status: 'reading', last_chapter_id: ch.id }, token,
    }).catch(() => {});
  }, [chapterIndex, book, token, id, chapters.length]);

  const goNext = () => setChapterIndex((i) => Math.min(chapters.length - 1, i + 1));
  const goPrev = () => setChapterIndex((i) => Math.max(0, i - 1));
  const goToChapter = (idx: number) => { setChapterIndex(idx); setShowToc(false); };

  const currentChapterId = chapters[chapterIndex]?.id;
  const isBookmarked = bookmarks.some((b) => b.chapter_id === currentChapterId);

  const toggleBookmark = async () => {
    if (!token || !id || !currentChapterId) return;
    const existing = bookmarks.find((b) => b.chapter_id === currentChapterId);
    if (existing) {
      await api(`/reader/${id}/bookmarks/${existing.id}`, { method: 'DELETE', token });
      setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
    } else {
      await api(`/reader/${id}/bookmarks`, {
        method: 'POST',
        body: { chapter_id: currentChapterId },
        token,
      });
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

    setSelectionMenu({
      text,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 10,
    });
  };

  const addHighlight = async () => {
    if (!token || !id || !selectionMenu || !currentChapterId) return;
    await api(`/reader/${id}/highlights`, {
      method: 'POST',
      body: {
        chapter_id: currentChapterId,
        text: selectionMenu.text,
        color: highlightColor,
      },
      token,
    });
    setHighlights((prev) => [...prev, {
      id: Date.now(), chapter_id: currentChapterId,
      text: selectionMenu!.text, color: highlightColor,
      note: null, created_at: new Date().toISOString(),
    }]);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const deleteHighlight = async (hlId: number) => {
    if (!token || !id) return;
    await api(`/reader/${id}/highlights/${hlId}`, { method: 'DELETE', token });
    setHighlights((prev) => prev.filter((h) => h.id !== hlId));
  };

  const theme = THEME_STYLES[settings.theme];

  if (!book) {
    return <div className="text-center text-gray-400 py-20">加载中...</div>;
  }

  return (
    <div className={`h-screen flex flex-col ${theme.bg} ${theme.text}`}>
      {/* Top bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${theme.border} shrink-0`}>
        <div className="flex items-center gap-3">
          <Link to={`/book/${id}`} className="text-sm opacity-70 hover:opacity-100">← 返回</Link>
          <button onClick={() => { setShowToc(!showToc); setShowBookmarks(false); setShowHighlights(false); }} className="text-sm opacity-70 hover:opacity-100">目录</button>
          {user && (
            <>
              <button onClick={() => { setShowBookmarks(!showBookmarks); setShowToc(false); setShowHighlights(false); }} className="text-sm opacity-70 hover:opacity-100">书签</button>
              <button onClick={() => { setShowHighlights(!showHighlights); setShowToc(false); setShowBookmarks(false); }} className="text-sm opacity-70 hover:opacity-100">笔记</button>
            </>
          )}
        </div>
        <div className="text-sm opacity-50 truncate max-w-xs">{chapters[chapterIndex]?.title}</div>
        <div className="flex items-center gap-3">
          {user && (
            <button onClick={toggleBookmark} className={`text-sm ${isBookmarked ? 'text-yellow-500' : 'opacity-70'} hover:opacity-100`}>
              <BookmarkIcon size={18} filled={isBookmarked} color={isBookmarked ? '#eab308' : 'currentColor'} />
            </button>
          )}
          <span className="text-xs opacity-50">{chapterIndex + 1}/{chapters.length}</span>
          <button onClick={() => { setShowSettings(!showSettings); setShowToc(false); setShowBookmarks(false); setShowHighlights(false); }} className="text-sm opacity-70 hover:opacity-100">设置</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* TOC Sidebar */}
        {showToc && (
          <div className={`w-72 ${theme.sidebar} border-r ${theme.border} overflow-y-auto shrink-0 absolute sm:relative z-10 h-full`}>
            <div className="p-4">
              <h3 className="text-xs font-semibold opacity-50 uppercase tracking-wide mb-3">目录</h3>
              <div className="space-y-0.5">
                {chapters.map((ch, idx) => (
                  <button key={ch.id} onClick={() => goToChapter(idx)}
                    className={`block w-full text-left py-1.5 px-2 rounded truncate ${
                      ch.level === 1 ? 'font-semibold text-sm' : 'text-sm pl-5'
                    } ${
                      idx === chapterIndex
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : ch.level === 1
                          ? 'hover:bg-black/5 opacity-90 hover:opacity-100'
                          : 'hover:bg-black/5 opacity-70 hover:opacity-100'
                    }`}>
                    {ch.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bookmarks Sidebar */}
        {showBookmarks && (
          <div className={`w-72 ${theme.sidebar} border-r ${theme.border} overflow-y-auto shrink-0 absolute sm:relative z-10 h-full`}>
            <div className="p-4">
              <h3 className="text-xs font-semibold opacity-50 uppercase tracking-wide mb-3">书签 ({bookmarks.length})</h3>
              {bookmarks.length === 0 ? (
                <p className="text-sm opacity-50">暂无书签，点击书签按钮添加</p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bm) => {
                    const chIdx = chapters.findIndex((c) => c.id === bm.chapter_id);
                    return (
                      <button key={bm.id} onClick={() => { if (chIdx >= 0) goToChapter(chIdx); }}
                        className="block w-full text-left text-sm py-2 px-2 rounded hover:bg-black/5">
                        <span className="text-yellow-500 mr-1"><BookmarkIcon size={14} filled color="#eab308" /></span>
                        {chapters[chIdx]?.title || '未知章节'}
                        <span className="block text-xs opacity-40 mt-0.5">{new Date(bm.created_at).toLocaleDateString()}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Highlights Sidebar */}
        {showHighlights && (
          <div className={`w-72 ${theme.sidebar} border-r ${theme.border} overflow-y-auto shrink-0 absolute sm:relative z-10 h-full`}>
            <div className="p-4">
              <h3 className="text-xs font-semibold opacity-50 uppercase tracking-wide mb-3">笔记与高亮 ({highlights.length})</h3>
              {highlights.length === 0 ? (
                <p className="text-sm opacity-50">选中文本后可添加高亮和笔记</p>
              ) : (
                <div className="space-y-2">
                  {highlights.map((hl) => {
                    const colorMap: Record<string, string> = { yellow: 'bg-yellow-200', green: 'bg-green-200', blue: 'bg-blue-200', pink: 'bg-pink-200', orange: 'bg-orange-200' };
                    return (
                      <div key={hl.id} className="text-sm p-2 rounded bg-black/5">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`border-l-3 pl-2 ${colorMap[hl.color] || 'bg-yellow-200'} border-transparent`}
                            style={{ borderLeftColor: hl.color }}>
                            {hl.text.length > 80 ? hl.text.slice(0, 80) + '...' : hl.text}
                          </p>
                          <button onClick={() => deleteHighlight(hl.id)} className="text-xs opacity-40 hover:opacity-100 shrink-0">×</button>
                        </div>
                        <span className="text-xs opacity-40 mt-1 block">
                          {chapters.find((c) => c.id === hl.chapter_id)?.title} · {new Date(hl.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className={`w-64 ${theme.sidebar} border-l ${theme.border} p-4 space-y-4 shrink-0 absolute right-0 sm:relative z-10 h-full`}>
            <h3 className="text-xs font-semibold opacity-50 uppercase tracking-wide">阅读设置</h3>
            <div>
              <label className="text-xs opacity-60 block mb-1">字体大小: {settings.fontSize}px</label>
              <input type="range" min="12" max="28" value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="text-xs opacity-60 block mb-1">行距: {settings.lineHeight}</label>
              <input type="range" min="1.2" max="3" step="0.1" value={settings.lineHeight}
                onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="text-xs opacity-60 block mb-2">主题</label>
              <div className="flex gap-2">
                {(['light', 'sepia', 'dark'] as const).map((t) => (
                  <button key={t} onClick={() => updateSettings({ theme: t })}
                    className={`px-3 py-1 rounded text-xs border ${
                      settings.theme === t ? 'border-blue-500 bg-blue-50' : ''
                    }`}>
                    {t === 'light' ? '白天' : t === 'sepia' ? '护眼' : '夜间'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto" onClick={() => setSelectionMenu(null)}>
          <div ref={contentRef} className="max-w-2xl mx-auto px-6 py-8 relative" onMouseUp={handleMouseUp}>
            {chapter ? (
              <>
                <h2 className="text-xl font-bold text-center mb-8">{chapter.title}</h2>
                <div
                  style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                  }}
                  className="whitespace-pre-wrap select-text"
                >
                  {chapter.content}
                </div>
              </>
            ) : (
              <div className="text-center opacity-50 py-20">加载章节中...</div>
            )}

            {/* Highlight selection menu */}
            {selectionMenu && (
              <div className="absolute z-20 bg-white border rounded-lg shadow-lg p-2 flex items-center gap-2"
                style={{ left: `${selectionMenu.x}px`, top: `${selectionMenu.y}px`, transform: 'translate(-50%, -100%)' }}
                onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-500">高亮:</span>
                {HIGHLIGHT_COLORS.map((c) => (
                  <button key={c} onClick={() => setHighlightColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${highlightColor === c ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: c === 'yellow' ? '#fde047' : c === 'green' ? '#86efac' : c === 'blue' ? '#93c5fd' : c === 'pink' ? '#f9a8d4' : '#fdba74' }} />
                ))}
                <button onClick={addHighlight} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                  标记
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className={`flex items-center justify-between px-4 py-2 border-t ${theme.border} shrink-0`}>
        <button
          onClick={goPrev}
          disabled={chapterIndex === 0}
          className="text-sm opacity-70 hover:opacity-100 disabled:opacity-30"
        >
          ← 上一章
        </button>
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((chapterIndex + 1) / chapters.length) * 100}%` }}
          />
        </div>
        <button
          onClick={goNext}
          disabled={chapterIndex === chapters.length - 1}
          className="text-sm opacity-70 hover:opacity-100 disabled:opacity-30"
        >
          下一章 →
        </button>
      </div>
    </div>
  );
}
