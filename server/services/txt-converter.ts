import { getDbSync } from '../db.js';

export function epubToTxt(bookId: number): string {
  const db = getDbSync();

  const bookResult = db.exec(`SELECT title, author FROM books WHERE id = ?`, [bookId]);
  if (bookResult.length === 0 || bookResult[0].values.length === 0) {
    throw new Error('书籍不存在');
  }

  const [title, author] = bookResult[0].values[0];

  const chapResult = db.exec(
    `SELECT title, content FROM chapters WHERE book_id = ? ORDER BY sort_order`,
    [bookId],
  );

  if (chapResult.length === 0 || chapResult[0].values.length === 0) {
    throw new Error('书籍无章节内容');
  }

  const lines: string[] = [];
  lines.push(`《${title}》`);
  lines.push(`作者：${author}`);
  lines.push('');
  lines.push('='.repeat(40));
  lines.push('');

  for (const row of chapResult[0].values) {
    const [chapTitle, content] = row;
    lines.push('');
    lines.push(chapTitle as string);
    lines.push('-'.repeat(30));
    lines.push('');
    if (content) {
      lines.push(content as string);
    }
    lines.push('');
  }

  return lines.join('\n');
}
