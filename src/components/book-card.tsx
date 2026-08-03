import { Link } from 'react-router-dom';
import { BookIcon } from './icons';

interface BookCardProps {
  id: number;
  title: string;
  author: string;
  has_cover?: boolean;
  description?: string | null;
  file_format: string;
  tags?: string[];
  read_status?: string | null;
  read_progress?: number;
}

const STATUS_LABELS: Record<string, string> = {
  want: '想读',
  reading: '在读',
  finished: '读过',
};

export function BookCard({ id, title, author, has_cover, description, file_format, tags, read_status, read_progress }: BookCardProps) {
  return (
    <Link
      to={`/book/${id}`}
      className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
    >
      <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
        {has_cover ? (
          <img
            src={`/api/books/${id}/cover`}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <BookIcon size={48} />
          </div>
        )}
        <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
          {file_format.toUpperCase()}
        </span>
        {read_status && read_status !== 'want' && (
          <span className={`absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded ${
            read_status === 'reading' ? 'bg-green-500/80 text-white' :
            read_status === 'finished' ? 'bg-blue-500/80 text-white' :
            'bg-black/60 text-white'
          }`}>
            {STATUS_LABELS[read_status] || read_status}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-800 truncate">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{author}</p>
        {read_progress != null && read_progress > 0 && (
          <div className="mt-2">
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(read_progress * 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 text-right">{Math.round(read_progress * 100)}%</p>
          </div>
        )}
        {description && !read_progress && (
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
