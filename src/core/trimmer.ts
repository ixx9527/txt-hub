export function trimText(text: string): string {
  const lines = text.split(/\r\n|\r|\n/);

  const trimmed = lines.map((line) => line.trim());

  const merged: string[] = [];
  let prevEmpty = false;
  for (const line of trimmed) {
    if (line === '') {
      if (!prevEmpty) {
        merged.push('');
      }
      prevEmpty = true;
    } else {
      merged.push(line);
      prevEmpty = false;
    }
  }

  let start = 0;
  while (start < merged.length && merged[start] === '') start++;
  let end = merged.length - 1;
  while (end >= 0 && merged[end] === '') end--;

  return merged.slice(start, end + 1).join('\n');
}
