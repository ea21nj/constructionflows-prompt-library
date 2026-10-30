import { expect } from 'vitest';

export const latin1 = (bytes) => new TextDecoder('latin1').decode(bytes);

// What every PDF reader relies on: the header, each object exactly where the cross-reference table
// says, stream lengths that match, and a page count that matches the pages. Returns the page count.
export function checkPdf(bytes) {
  const src = latin1(bytes);
  expect(src.startsWith('%PDF-1.4')).toBe(true);
  expect(src.trimEnd().endsWith('%%EOF')).toBe(true);
  const startxref = Number(src.match(/startxref\s+(\d+)\s+%%EOF\s*$/)[1]);
  expect(src.slice(startxref, startxref + 4)).toBe('xref');
  const [, , count] = src.slice(startxref).match(/xref\s+(\d+) (\d+)/).map(Number);
  const rows = src.slice(startxref).split('\n').slice(2, 2 + count);
  rows.slice(1).forEach((row, i) => expect(src.slice(Number(row.slice(0, 10)))).toMatch(new RegExp(`^${i + 1} 0 obj`)));
  for (const m of src.matchAll(/\/Length (\d+) >>\nstream\n/g)) {
    const start = m.index + m[0].length;
    expect(src.slice(start + Number(m[1]), start + Number(m[1]) + 10)).toBe('\nendstream');
  }
  const pages = (src.match(/\/Type \/Page\b/g) || []).length;
  expect(src).toMatch(new RegExp(`/Count ${pages}\\b`));
  return pages;
}

