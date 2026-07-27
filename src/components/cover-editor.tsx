import { useEffect, useRef, useState, useCallback } from 'react';
import { generateCover, THEMES, CoverTheme } from '../core/cover-generator';

type Mode = 'auto' | 'ai' | 'upload';

const PRESET_TAGS = ['水墨风', '赛博朋克', '极简主义', '复古', '科幻', '奇幻', '油画', '扁平插画', '中国风', '日系动漫'];

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
    const parts = [...selectedTags];
    if (aiStyle.trim()) parts.push(aiStyle.trim());
    const style = parts.length > 0 ? parts.join('，') : undefined;
    try {
      const resp = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author: author || '佚名', style }),
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
  }, [title, author, selectedTags, aiStyle, aiLoading, onCoverChange]);

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setAiError(null);
  }, []);

  const currentThemeName = selectedTheme ? selectedTheme.name : '随机';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">封面</h3>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${mode === 'auto' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => {
                if (mode === 'auto') {
                  setShowThemePicker((v) => !v);
                } else {
                  switchMode('auto');
                }
              }}
            >
              <span>自动生成{mode === 'auto' ? ` · ${currentThemeName}` : ''}</span>
              {mode === 'auto' && (
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>

            {mode === 'auto' && showThemePicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowThemePicker(false)} />
                <div className="absolute z-20 top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[160px] max-h-64 overflow-y-auto">
                  <button
                    className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 text-gray-700 flex items-center gap-2"
                    onClick={() => handleThemeSelect(null)}
                  >
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                    </svg>
                    随机
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

          {([
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

      {/* AI style tags — only in AI mode */}
      {mode === 'ai' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    selected
                      ? 'bg-slate-600 text-white border-slate-600'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => {
                    setSelectedTags((prev) =>
                      selected ? prev.filter((t) => t !== tag) : [...prev, tag],
                    );
                  }}
                >
                  {tag}
                  {selected && (
                    <svg className="inline-block w-3 h-3 ml-0.5 -mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="自定义风格描述（可选）"
            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-slate-400"
            value={aiStyle}
            onChange={(e) => setAiStyle(e.target.value)}
            maxLength={500}
          />
          <button
            className="w-full text-sm px-4 py-2 rounded-lg font-medium bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
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
              <>
                <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.582a.5.5 0 010 .962L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z" />
                </svg>
                <span>生成封面</span>
              </>
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
