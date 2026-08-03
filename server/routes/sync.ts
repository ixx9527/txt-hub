import { Router, Request, Response } from 'express';
import { getDbSync } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /sync?cursor=<ISO timestamp>
// Returns incremental changes since cursor across books, progress, TTS, and deletions
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const userId = req.user!.userId;
    const cursor = req.query.cursor as string;

    // 1. New/updated books (by created_at for new, updated_at for metadata changes)
    let books: Array<{
      id: number; title: string; author: string; file_format: string;
      file_size: number; content_hash: string | null; cover_path: string | null;
      created_at: string; updated_at: string;
    }> = [];

    if (cursor) {
      const booksResult = db.exec(
        `SELECT id, title, author, file_format, file_size, content_hash, cover_path, created_at, updated_at
         FROM books
         WHERE upload_user_id = ? AND (created_at > ? OR updated_at > ?)
         ORDER BY created_at ASC
         LIMIT 500`,
        [userId, cursor, cursor],
      );
      books = (booksResult[0]?.values || []).map((row) => ({
        id: row[0] as number,
        title: row[1] as string,
        author: row[2] as string,
        file_format: row[3] as string,
        file_size: row[4] as number,
        content_hash: row[5] as string | null,
        cover_path: row[6] as string | null,
        created_at: row[7] as string,
        updated_at: row[8] as string,
      }));
    } else {
      // No cursor = full initial sync
      const booksResult = db.exec(
        `SELECT id, title, author, file_format, file_size, content_hash, cover_path, created_at, updated_at
         FROM books
         WHERE upload_user_id = ?
         ORDER BY created_at ASC
         LIMIT 500`,
        [userId],
      );
      books = (booksResult[0]?.values || []).map((row) => ({
        id: row[0] as number,
        title: row[1] as string,
        author: row[2] as string,
        file_format: row[3] as string,
        file_size: row[4] as number,
        content_hash: row[5] as string | null,
        cover_path: row[6] as string | null,
        created_at: row[7] as string,
        updated_at: row[8] as string,
      }));
    }

    // 2. Progress changes
    let progressChanges: Array<{
      book_id: number; progress: number; locator: string | null;
      current_cfi: string | null; status: string; version: number;
      last_chapter_id: string | null; updated_at: string;
    }> = [];

    const progressQuery = cursor
      ? `SELECT book_id, progress, locator, current_cfi, status, version, last_chapter_id, updated_at
         FROM user_books WHERE user_id = ? AND updated_at > ?
         ORDER BY updated_at ASC LIMIT 500`
      : `SELECT book_id, progress, locator, current_cfi, status, version, last_chapter_id, updated_at
         FROM user_books WHERE user_id = ?
         ORDER BY updated_at ASC LIMIT 500`;
    const progressParams: (string | number)[] = cursor ? [userId, cursor] : [userId];
    const progressResult = db.exec(progressQuery, progressParams);
    progressChanges = (progressResult[0]?.values || []).map((row) => ({
      book_id: row[0] as number,
      progress: row[1] as number,
      locator: row[2] as string | null,
      current_cfi: row[3] as string | null,
      status: row[4] as string,
      version: row[5] as number,
      last_chapter_id: row[6] as string | null,
      updated_at: row[7] as string,
    }));

    // 3. TTS progress changes
    let ttsChanges: Array<{
      book_id: number; locator: string; updated_at: string;
    }> = [];

    const ttsQuery = cursor
      ? `SELECT book_id, locator, updated_at FROM tts_progress
         WHERE user_id = ? AND updated_at > ?
         ORDER BY updated_at ASC LIMIT 500`
      : `SELECT book_id, locator, updated_at FROM tts_progress
         WHERE user_id = ?
         ORDER BY updated_at ASC LIMIT 500`;
    const ttsParams: (string | number)[] = cursor ? [userId, cursor] : [userId];
    const ttsResult = db.exec(ttsQuery, ttsParams);
    ttsChanges = (ttsResult[0]?.values || []).map((row) => ({
      book_id: row[0] as number,
      locator: row[1] as string,
      updated_at: row[2] as string,
    }));

    // 4. Deleted books (tombstones)
    let deletedBookIds: Array<{
      book_id: number; delete_type: string; deleted_at: string;
    }> = [];

    const deletedQuery = cursor
      ? `SELECT book_id, delete_type, deleted_at FROM deleted_books
         WHERE user_id = ? AND deleted_at > ?
         ORDER BY deleted_at ASC LIMIT 500`
      : `SELECT book_id, delete_type, deleted_at FROM deleted_books
         WHERE user_id = ?
         ORDER BY deleted_at ASC LIMIT 500`;
    const deletedParams: (string | number)[] = cursor ? [userId, cursor] : [userId];
    const deletedResult = db.exec(deletedQuery, deletedParams);
    deletedBookIds = (deletedResult[0]?.values || []).map((row) => ({
      book_id: row[0] as number,
      delete_type: row[1] as string,
      deleted_at: row[2] as string,
    }));

    // Compute next_cursor as the max timestamp across all results
    const allTimestamps = [
      ...books.map((b) => b.updated_at),
      ...progressChanges.map((p) => p.updated_at),
      ...ttsChanges.map((t) => t.updated_at),
      ...deletedBookIds.map((d) => d.deleted_at),
    ].filter(Boolean);

    const nextCursor = allTimestamps.length > 0
      ? allTimestamps.reduce((a, b) => (a > b ? a : b))
      : cursor || null;

    res.json({
      books,
      progress_changes: progressChanges,
      tts_changes: ttsChanges,
      deleted_book_ids: deletedBookIds,
      next_cursor: nextCursor,
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: '同步失败' });
  }
});

export default router;
