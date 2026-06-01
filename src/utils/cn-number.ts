const DIGITS: Record<string, number> = {
  零: 0, 〇: 0,
  一: 1, 壹: 1,
  二: 2, 贰: 2, 两: 2,
  三: 3, 叁: 3,
  四: 4, 肆: 4,
  五: 5, 伍: 5,
  六: 6, 陆: 6,
  七: 7, 柒: 7,
  八: 8, 捌: 8,
  九: 9, 玖: 9,
};

const UNITS: Record<string, number> = {
  十: 10, 拾: 10,
  百: 100, 佰: 100,
  千: 1000, 仟: 1000,
  万: 10000,
  亿: 100000000,
};

export function chineseToNumber(str: string): number {
  if (/^\d+$/.test(str)) return parseInt(str, 10);

  let result = 0;
  let section = 0;
  let current = 0;

  for (const char of str) {
    const digit = DIGITS[char];
    const unit = UNITS[char];

    if (digit !== undefined) {
      current = digit;
    } else if (unit !== undefined) {
      if (unit === 10 && current === 0 && section === 0 && result === 0) {
        current = 1;
      }
      if (unit >= 10000) {
        section = (section + current) * unit;
        result += section;
        section = 0;
      } else {
        section += (current || 1) * unit;
      }
      current = 0;
    }
  }

  return result + section + current;
}
