import { useEffect, useRef, useState, useCallback } from 'react';
import { generateCover, THEMES, CoverTheme } from '../core/cover-generator';

type Mode = 'auto' | 'ai' | 'upload';

interface Props {
  title: string;
  author: string;
  onCoverChange: (blob: Blob) => void;
}

export function CoverEditor({ title, author, onCoverChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('auto');
  const [selectedTheme, setSelectedTheme] = useState<CoverTheme | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // AI state
  const [aiStyle, setAiStyle] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-generate cover when title/author/theme changes in auto mode
  useEffect(() => {
    if (mode !== 'auto') return;
    if (!title) return;

    let cancelled = false;
    generateCover(title, author || '佚名', selectedTheme ?? undefined).then((blob) => {
      if (cancelled) return;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      onCoverChange(blob);
    });
    return () => { cancelled = true; };
  }, [title, author, mode, selectedTheme, onCoverChange]);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setMode('upload');
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      onCoverChange(file);
    },
    [onCoverChange],
  );

  const handleThemeSelect = useCallback(
    (theme: CoverTheme | null) => {
      setMode('auto');
      setSelectedTheme(theme);
      setShowThemePicker(false);
    },
    [],
  );

  const handleAiGenerate = useCallback(async () => {
    if (!title || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const resp = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author: author || '佚名', style: aiStyle || undefined }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || '生成失败');
      }
      const binary = atob(data.image);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mimeType || 'image/png' });
      setMode('ai');
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      onCoverChange(blob);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setAiLoading(false);
    }
  }, [title, author, aiStyle, aiLoading, onCoverChange]);

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setAiError(null);
  }, []);

  const currentThemeName = selectedTheme ? selectedTheme.name : '随机';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">封面</h3>
        <div className="flex gap-1.5">
          {([
            ['auto', '自动生成'],
            ['ai', 'AI 生成'],
            ['upload', '上传图片'],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              className={`text-xs px-2 py-0.5 rounded ${mode === m ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => {
                if (m === 'upload') inputRef.current?.click();
                else switchMode(m);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme picker — only in auto mode */}
      {mode === 'auto' && (
        <div className="relative">
          <button
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 flex items-center gap-1"
            onClick={() => setShowThemePicker((v) => !v)}
          >
            <span>主题: {currentThemeName}</span>
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showThemePicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowThemePicker(false)} />
              <div className="absolute z-20 top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[160px] max-h-64 overflow-y-auto">
                <button
                  className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 text-gray-700"
                  onClick={() => handleThemeSelect(null)}
                >
                  🎲 随机
                </button>
                <div className="my-1 border-t border-gray-100" />
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => handleThemeSelect(theme)}
                  >
                    <span
                      className="inline-block w-4 h-4 rounded-sm border border-gray-300 shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${theme.stops[0][1]}, ${theme.stops[theme.stops.length - 1][1]})`,
                      }}
                    />
                    {theme.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* AI style input — only in AI mode */}
      {mode === 'ai' && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="风格描述（可选，如：水墨风、赛博朋克、极简主义）"
            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-400"
            value={aiStyle}
            onChange={(e) => setAiStyle(e.target.value)}
            maxLength={500}
          />
          <button
            className="w-full text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            onClick={handleAiGenerate}
            disabled={aiLoading || !title}
          >
            {aiLoading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>生成中…</span>
              </>
            ) : (
              '✨ 生成封面'
            )}
          </button>
          {aiError && (
            <p className="text-xs text-red-500">{aiError}</p>
          )}
        </div>
      )}

      {/* Show AI generate button when switching to AI mode with no result yet */}
      {mode === 'ai' && !previewUrl && !aiLoading && (
        <p className="text-xs text-gray-400 text-center">点击上方按钮生成 AI 封面</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {previewUrl && (
        <div className="flex justify-center">
          <img
            src={previewUrl}
            alt="封面预览"
            className="max-h-64 rounded shadow-sm border border-gray-200"
          />
        </div>
      )}
    </div>
  );
}
