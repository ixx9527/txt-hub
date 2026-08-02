import { useState, useEffect } from 'react';
import { api } from '../hooks/use-api';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  children: Category[];
}

interface CategoryTreeProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function CategoryTree({ selectedId, onSelect }: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(data.categories))
      .catch(console.error);
  }, []);

  const renderNode = (cat: Category, depth: number = 0) => (
    <div key={cat.id}>
      <button
        onClick={() => onSelect(selectedId === cat.id ? null : cat.id)}
        className={`block w-full text-left text-sm py-1 px-2 rounded truncate ${
          selectedId === cat.id
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {cat.children.length > 0 && (
          <span className="inline-block w-4 text-xs opacity-50">▸</span>
        )}
        {cat.name}
      </button>
      {cat.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div>
      <button
        onClick={() => onSelect(null)}
        className={`block w-full text-left text-sm py-1 px-2 rounded mb-1 ${
          selectedId === null ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        全部分类
      </button>
      {categories.map((cat) => renderNode(cat))}
    </div>
  );
}
