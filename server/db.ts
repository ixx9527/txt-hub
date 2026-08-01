import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'data/txthub.db');

let db: Database;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  initTables(db);
  save();

  return db;
}

export function getDbSync(): Database {
  if (!db) throw new Error('Database not initialized. Call getDb() first.');
  return db;
}

export function save(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function initTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '佚名',
      publisher TEXT,
      description TEXT,
      language TEXT NOT NULL DEFAULT 'zh-CN',
      isbn TEXT,
      cover_path TEXT,
      file_path TEXT NOT NULL,
      file_format TEXT NOT NULL DEFAULT 'epub',
      file_size INTEGER NOT NULL DEFAULT 0,
      upload_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS book_categories (
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (book_id, category_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS book_tags (
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (book_id, tag_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_books (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'want',
      progress REAL NOT NULL DEFAULT 0,
      current_cfi TEXT,
      last_read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, book_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_id TEXT,
      cfi TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_id TEXT,
      cfi TEXT,
      text TEXT,
      color TEXT NOT NULL DEFAULT 'yellow',
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  // FTS5 not available in sql.js WASM; using LIKE queries instead
  // Indexes for search performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_chapters_title ON chapters(title)`);

  // Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_books_format ON books(file_format)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_books_user ON user_books(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, book_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_highlights_user ON highlights(user_id, book_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id)`);
}
