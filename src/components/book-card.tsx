import { Link } from 'react-router-dom';

interface BookCardProps {
  id: number;
  title: string;
  author: string;
  cover_path: string | null;
  description?: string | null;
  file_format: string;
  tags?: string[];
}

export function BookCard({ id, title, author, cover_path, description, file_format, tags }: BookCardProps) {
  return (
    <Link
      to={`/book/${id}`}
      className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
    >
      <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
        {cover_path ? (
          <img
            src={`/uploads/${cover_path.split('/').pop()}`}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
        )}
        <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
          {file_format.toUpperCase()}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-800 truncate">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{author}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{description}</p>
        )}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
