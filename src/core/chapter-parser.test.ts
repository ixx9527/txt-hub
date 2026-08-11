import { describe, it, expect } from 'vitest';
import { parseChapters } from './chapter-parser';

describe('parseChapters', () => {
  it('parses classic Chinese chapter headings', () => {
    const text = `前言内容

第一章 楔子
这里是楔子的正文

第二章 初入江湖
这里是第二章的正文`;

    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(3);
    expect(result.chapters[0].title).toBe('前言');
    expect(result.chapters[1].title).toBe('第一章 楔子');
    expect(result.chapters[2].title).toBe('第二章 初入江湖');
  });

  it('returns single chapter when no headings found', () => {
    const text = '这是一段没有章节标题的普通文本。';
    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].title).toBe('全文');
  });

  it('skips sequential numbered lists (body text, not chapters)', () => {
    const text = `根据照片和网站上的说明，可以总结出以下事实。
1.这个剧场里极具特色的回转式舞台是由建筑大师·伊山久郎先生设计的。演出时舞台那半边露在外面，另外半边在幕后。
2.舞台上方有一个华丽的枝型吊灯。平时吊灯的高度大约与二层平齐，但演出时会拉到天花板附近。
3.除了吊灯以外的照明设施全都在天花板上。
4.台左的墙壁上有一个电子挂钟，朝向观众方向。
5.正对二层中央包厢门的墙壁上有一个石英钟。

第一章 真正的章节
这里是正文。`;

    const result = parseChapters(text);
    // The 1-5 list should NOT be split into chapters.
    // We should get: preamble (含列表) + 第一章
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('前言');
    // Preamble should contain the list text
    expect(result.chapters[0].content).toContain('1.这个剧场');
    expect(result.chapters[1].title).toBe('第一章 真正的章节');
  });

  it('does NOT skip isolated "1. Title" — could be a real chapter', () => {
    const text = `1. 序幕
序幕的内容

2. 开端
开端的内容`;

    const result = parseChapters(text);
    // Only 2 items, not >= 3, so treated as chapters
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('1. 序幕');
    expect(result.chapters[1].title).toBe('2. 开端');
  });

  it('skips list with Chinese enumeration dot (、)', () => {
    const text = `注意事项：
1、第一条规则内容
2、第二条规则内容
3、第三条规则内容

第一章 故事开始
这里是故事开始的正文内容`;

    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('前言');
    expect(result.chapters[0].content).toContain('1、');
    expect(result.chapters[1].title).toBe('第一章 故事开始');
  });

  it('skips list with full-width dot (．)', () => {
    const text = `说明如下：
1．第一点说明
2．第二点说明
3．第三点说明

第一章 正文开始`;

    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].content).toContain('1．');
    expect(result.chapters[1].title).toBe('第一章 正文开始');
  });

  it('list separated by blank lines is NOT skipped', () => {
    const text = `1. 第一个要点

中间隔了空行

2. 第二个要点

又隔了空行

3. 第三个要点`;

    const result = parseChapters(text);
    // Blank lines break the list detection → treated as chapters
    expect(result.chapters).toHaveLength(3);
  });

  it('rejects "7、0、7" — title part is just digits, not real text', () => {
    const text = `蓝川这样说着，拨通了荔枝房间的号码。
7、0、7
在一阵铃声过后，"来了"的声音响起。

第一章 调查开始
调查的正文`;

    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('前言');
    // The preamble should contain "7、0、7" as body text, not split
    expect(result.chapters[0].content).toContain('7、0、7');
    expect(result.chapters[1].title).toBe('第一章 调查开始');
  });

  it('rejects "4.5.不，不对。" — sub-numbered body text like N.N.xxx', () => {
    const text = `综上所述，荔枝是男人。Q.E.D.
4.5.不，不对。
文中不是有数处称呼她为"她"吗。

5.5
不，不对。
请看看下面这句话。

第一章 调查开始
调查的正文`;

    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('前言');
    expect(result.chapters[0].content).toContain('4.5.不，不对。');
    expect(result.chapters[0].content).toContain('5.5');
    expect(result.chapters[1].title).toBe('第一章 调查开始');
  });

  it('parses Chapter X (English style)', () => {
    const text = `Chapter 1: The Beginning
Content of chapter 1

Chapter 2: The Journey
Content of chapter 2`;

    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('Chapter 1: The Beginning');
    expect(result.chapters[1].title).toBe('Chapter 2: The Journey');
  });

  it('normalizes irregular spaces in chapter headings', () => {
    const text = `第7 章 入职
入职的正文

第 8章 新任务
新任务的正文

第 9 章 决战
决战的正文`;

    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(3);
    expect(result.chapters[0].title).toBe('第7章 入职');
    expect(result.chapters[1].title).toBe('第8章 新任务');
    expect(result.chapters[2].title).toBe('第9章 决战');
  });

  it('normalizes irregular spaces in volume headings', () => {
    const text = `第 1 卷 初入江湖
第一章 楔子
楔子的正文

第 2卷 风云再起
第二章 新世界
新世界的正文`;

    const result = parseChapters(text);
    expect(result.hasVolumeStructure).toBe(true);
    expect(result.volumes[0].title).toBe('第1卷 初入江湖');
    expect(result.volumes[1].title).toBe('第2卷 风云再起');
  });

  it('normalizes irregular spaces in English chapter headings', () => {
    const text = `Chapter  7 : The Battle
Content here

Chapter 8:The Return
More content`;

    const result = parseChapters(text);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('Chapter 7: The Battle');
    expect(result.chapters[1].title).toBe('Chapter 8: The Return');
  });

  it('handles volume + chapter structure', () => {
    const text = `第一卷 初入江湖
开篇引言

第一章 楔子
楔子的正文

第二卷 风云再起
第二章 新世界
新世界的正文`;

    const result = parseChapters(text);
    expect(result.hasVolumeStructure).toBe(true);
    expect(result.volumes).toHaveLength(2);
    expect(result.volumes[0].title).toBe('第一卷 初入江湖');
    expect(result.volumes[0].chapters).toHaveLength(2); // 开篇引言 + 第一章
    expect(result.volumes[1].title).toBe('第二卷 风云再起');
    expect(result.volumes[1].chapters).toHaveLength(1);
  });
});
