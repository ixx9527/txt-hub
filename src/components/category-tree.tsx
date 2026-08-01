import { useState, useEffect } from 'react';
import { Button } from 'animal-island-ui';
import { api } from '../hooks/use-api';

interface Category { id: number; name: string; parent_id: number | null; children: Category[]; }

interface CategoryTreeProps { selectedId: number | null; onSelect: (id: number | null) => void; }

export function CategoryTree({ selectedId, onSelect }: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api<{ categories: Category[] }>('/categories').then((data) => setCategories(data.categories)).catch(console.error);
  }, []);

  const renderNode = (cat: Category, depth: number = 0) => (
    <div key={cat.id}>
      <Button type={selectedId === cat.id ? 'primary' : 'text'} size="small" block
        style={{ textAlign: 'left', paddingLeft: depth * 12 + 8, justifyContent: 'flex-start', fontWeight: selectedId === cat.id ? 600 : 400 }}
        onClick={() => onSelect(selectedId === cat.id ? null : cat.id)}>
        {cat.name}
      </Button>
      {cat.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Button type={selectedId === null ? 'primary' : 'text'} size="small" block onClick={() => onSelect(null)} style={{ textAlign: 'left', justifyContent: 'flex-start' }}>全部分类</Button>
      {categories.map((cat) => renderNode(cat))}
    </div>
  );
}
