import type { BookMeta } from '../types';

interface Props {
  meta: BookMeta;
  onChange: (meta: BookMeta) => void;
}

export function MetadataForm({ meta, onChange }: Props) {
  const update = (field: keyof BookMeta, value: string) => {
    onChange({ ...meta, [field]: value });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">书籍信息</h3>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          书名 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={meta.title}
          onChange={(e) => update('title', e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          作者 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={meta.author}
          onChange={(e) => update('author', e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">出版社</label>
        <input
          type="text"
          value={meta.publisher || ''}
          onChange={(e) => update('publisher', e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">简介</label>
        <textarea
          value={meta.description || ''}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">语言</label>
        <select
          value={meta.language}
          onChange={(e) => update('language', e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="zh-CN">简体中文</option>
          <option value="zh-TW">繁体中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
    </div>
  );
}
