import JSZip from 'jszip';
import type { BookMeta, Chapter, Volume } from '../types';

interface EpubInput {
  meta: BookMeta;
  volumes: Volume[];
  chapters: Chapter[];
  hasVolumeStructure: boolean;
  coverBlob: Blob;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function textToHtml(content: string): string {
  return content
    .split('\n')
    .filter((line) => line.trim() !== '' || true)
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '';
      return `<p>${escapeXml(trimmed)}</p>`;
    })
    .filter(Boolean)
    .join('\n    ');
}

function getAllChapters(input: EpubInput): Chapter[] {
  if (input.hasVolumeStructure) {
    return input.volumes.flatMap((v) => v.chapters);
  }
  return input.chapters;
}

function buildChapterXhtml(chapter: Chapter): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h2>${escapeXml(chapter.title)}</h2>
  <div class="chapter-content">
    ${textToHtml(chapter.content)}
  </div>
</body>
</html>`;
}

function buildCoverXhtml(title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(title)}</title>
</head>
<body style="margin:0;padding:0;text-align:center;">
  <div style="height:100vh;display:flex;align-items:center;justify-content:center;">
    <img src="cover.jpg" alt="Cover" style="max-width:100%;max-height:100%;" />
  </div>
</body>
</html>`;
}

function buildStyleCss(): string {
  return `body {
  font-family: "Noto Serif SC", "Source Han Serif CN", "SimSun", serif;
  margin: 1em;
  line-height: 1.8;
  color: #333;
}
h2 {
  text-align: center;
  margin: 2em 0 1em;
  font-size: 1.3em;
}
.chapter-content p {
  text-indent: 2em;
  margin: 0.5em 0;
}`;
}

function buildContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`;
}

function buildContentOpf(meta: BookMeta, allChapters: Chapter[]): string {
  const uuid = crypto.randomUUID();
  const now = new Date().toISOString().split('.')[0] + 'Z';

  const manifestItems = allChapters
    .map((ch) => `    <item id="${ch.id}" href="${ch.id}.xhtml" media-type="application/xhtml+xml" />`)
    .join('\n');

  const spineItems = allChapters
    .map((ch) => `    <itemref idref="${ch.id}" />`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${escapeXml(meta.title)}</dc:title>
    <dc:creator>${escapeXml(meta.author)}</dc:creator>
    <dc:language>${meta.language}</dc:language>${meta.publisher ? `\n    <dc:publisher>${escapeXml(meta.publisher)}</dc:publisher>` : ''}${meta.description ? `\n    <dc:description>${escapeXml(meta.description)}</dc:description>` : ''}
    <meta property="dcterms:modified">${now}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
    <item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image" />
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml" />
    <item id="css" href="style.css" media-type="text/css" />
${manifestItems}
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover" linear="no" />
${spineItems}
  </spine>
</package>`;
}

function buildNavXhtml(
  meta: BookMeta,
  volumes: Volume[],
  chapters: Chapter[],
  hasVolumeStructure: boolean,
): string {
  let navItems: string;

  if (hasVolumeStructure) {
    navItems = volumes
      .map((vol) => {
        if (vol.chapters.length === 0) return '';
        const subItems = vol.chapters
          .map((ch) => `          <li><a href="${ch.id}.xhtml">${escapeXml(ch.title)}</a></li>`)
          .join('\n');
        return `        <li>
          <span>${escapeXml(vol.title)}</span>
          <ol>
${subItems}
          </ol>
        </li>`;
      })
      .filter(Boolean)
      .join('\n');
  } else {
    navItems = chapters
      .map((ch) => `        <li><a href="${ch.id}.xhtml">${escapeXml(ch.title)}</a></li>`)
      .join('\n');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(meta.title)} - 目录</title>
</head>
<body>
  <nav epub:type="toc">
    <h1>目录</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`;
}

function buildTocNcx(
  meta: BookMeta,
  volumes: Volume[],
  chapters: Chapter[],
  hasVolumeStructure: boolean,
): string {
  const uuid = crypto.randomUUID();
  let navPoints: string;
  let order = 1;

  if (hasVolumeStructure) {
    navPoints = volumes
      .map((vol) => {
        if (vol.chapters.length === 0) return '';
        const subPoints = vol.chapters
          .map((ch) => {
            const point = `      <navPoint id="navPoint-${order}" playOrder="${order}">
        <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
        <content src="${ch.id}.xhtml" />
      </navPoint>`;
            order++;
            return point;
          })
          .join('\n');
        const volPoint = `    <navPoint id="navPoint-vol-${order}" playOrder="${order}">
      <navLabel><text>${escapeXml(vol.title)}</text></navLabel>
      <content src="${vol.chapters[0].id}.xhtml" />
${subPoints}
    </navPoint>`;
        order++;
        return volPoint;
      })
      .filter(Boolean)
      .join('\n');
  } else {
    navPoints = chapters
      .map((ch) => {
        const point = `    <navPoint id="navPoint-${order}" playOrder="${order}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${ch.id}.xhtml" />
    </navPoint>`;
        order++;
        return point;
      })
      .join('\n');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}" />
    <meta name="dtb:depth" content="${hasVolumeStructure ? '2' : '1'}" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle><text>${escapeXml(meta.title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
}

export async function buildEpub(input: EpubInput): Promise<Blob> {
  const zip = new JSZip();
  const allChapters = getAllChapters(input);

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.file('META-INF/container.xml', buildContainerXml());

  const oebps = zip.folder('OEBPS')!;
  oebps.file('content.opf', buildContentOpf(input.meta, allChapters));
  oebps.file(
    'nav.xhtml',
    buildNavXhtml(input.meta, input.volumes, input.chapters, input.hasVolumeStructure),
  );
  oebps.file(
    'toc.ncx',
    buildTocNcx(input.meta, input.volumes, input.chapters, input.hasVolumeStructure),
  );
  oebps.file('cover.xhtml', buildCoverXhtml(input.meta.title));
  oebps.file('cover.jpg', input.coverBlob);
  oebps.file('style.css', buildStyleCss());

  for (const chapter of allChapters) {
    oebps.file(`${chapter.id}.xhtml`, buildChapterXhtml(chapter));
  }

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}
