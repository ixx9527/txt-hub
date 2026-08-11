import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { convertTxtToEpub } from '../services/txt-to-epub.js';
import { getDb, save, detectChapterLevel } from '../db.js';

const router = Router();

router.post(
  '/txt-to-epub',
  authMiddleware,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请选择 TXT 文件' });
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      if (ext !== '.txt') {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ error: '仅支持 TXT 文件' });
        return;
      }

      const rawName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8');
      const originalName = path.basename(rawName, '.txt');

      const options = {
        title: req.body.title || undefined,
        author: req.body.author || undefined,
        language: req.body.language || undefined,
        coverMode: (req.body.coverMode as 'random' | 'ai' | 'none') || 'random',
        coverTheme: req.body.coverTheme || undefined,
        aiStyle: req.body.aiStyle || undefined,
      };

      const result = await convertTxtToEpub(req.file.path, originalName, options);

      fs.unlinkSync(req.file.path);

      const safeName = result.title.replace(/[^\w\u4e00-\u9fff]/g, '_');
      res.setHeader('Content-Type', 'application/epub+zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}.epub"`);
      res.send(Buffer.from(result.epubBuffer));
    } catch (err) {
      console.error('TXT to EPUB conversion error:', err);
      res.status(500).json({ error: '转换失败' });
    }
  },
);

router.post(
  '/txt-to-epub-and-store',
  authMiddleware,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请选择 TXT 文件' });
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      if (ext !== '.txt') {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ error: '仅支持 TXT 文件' });
        return;
      }

      const rawName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8');
      const originalName = path.basename(rawName, '.txt');

      const options = {
        title: req.body.title || undefined,
        author: req.body.author || undefined,
        language: req.body.language || undefined,
        coverMode: (req.body.coverMode as 'random' | 'ai' | 'none') || 'random',
        coverTheme: req.body.coverTheme || undefined,
        aiStyle: req.body.aiStyle || undefined,
      };

      const result = await convertTxtToEpub(req.file.path, originalName, options);

      const contentHash = computeBufferHash(Buffer.from(result.epubBuffer));

      const coverDir = path.resolve(process.cwd(), 'uploads/covers');
      fs.mkdirSync(coverDir, { recursive: true });
      const coverFileName = `${uuidv4()}.jpg`;
      const coverPath = path.join(coverDir, coverFileName);
      if (result.coverBuffer) {
        fs.writeFileSync(coverPath, result.coverBuffer);
      }

      const epubDir = path.resolve(process.cwd(), 'uploads');
      const epubFileName = `${uuidv4()}.epub`;
      const epubPath = path.join(epubDir, epubFileName);
      fs.writeFileSync(epubPath, result.epubBuffer);

      const db = await getDb();

      db.run(
        `INSERT INTO books (title, author, publisher, description, language, isbn, cover_path, file_path, file_format, file_size, upload_user_id, content_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.title,
          result.author,
          null,
          null,
          result.language,
          null,
          result.coverBuffer ? coverPath : null,
          epubPath,
          'epub',
          result.epubBuffer.length,
          req.user!.userId,
          contentHash,
        ],
      );

      const idResult = db.exec('SELECT MAX(id) FROM books');
      const bookId = (idResult[0]?.values[0]?.[0] as number) || 0;
      save();

      if (result.chapters.length > 0) {
        for (let i = 0; i < result.chapters.length; i++) {
          const ch = result.chapters[i];
          const level = detectChapterLevel(ch.title);
          db.run(
            `INSERT INTO chapters (book_id, chapter_id, title, content, sort_order, level) VALUES (?, ?, ?, ?, ?, ?)`,
            [bookId, ch.id, ch.title, ch.content, i, level],
          );
        }
        save();
      }

      fs.unlinkSync(req.file.path);

      res.status(201).json({ id: bookId, title: result.title, format: 'epub' });
    } catch (err) {
      console.error('TXT to EPUB store error:', err);
      res.status(500).json({ error: '转换并入库失败' });
    }
  },
);

function computeBufferHash(buffer: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return `sha256:${hash.digest('hex')}`;
}

export default router;
