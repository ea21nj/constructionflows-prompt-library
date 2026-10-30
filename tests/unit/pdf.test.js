import { describe, test, expect } from 'vitest';
import { createPdf, pdfText, wrap, textWidth, PAGE } from '../../src/game/pdf.js';

import { checkPdf, latin1 } from './helpers/pdf-check.js';

describe('pdf writer', () => {
  test('writes a well-formed PDF with the text in it', () => {
    const doc = createPdf({ title: 'Test' });
    doc.heading('Hello site');
    doc.paragraph('A (bracketed) back\\slash line.');
    const bytes = doc.toBytes();
    expect(checkPdf(bytes)).toBe(1);
    const src = latin1(bytes);
    expect(src).toContain('(Hello site) Tj');
    expect(src).toContain('(A \\(bracketed\\) back\\\\slash line.) Tj');
    expect(src).toContain('/BaseFont /Helvetica-Bold');
    expect(src).toContain('/Encoding /WinAnsiEncoding');
  });

  test('typographic characters come through in the PDF font encoding', () => {
    expect(pdfText('It’s — “ok” • 1–2 · done… → ★ ✓')).toBe('It\\222s \\227 \\223ok\\224 \\225 1\\2262 \\267 done\\205 -> * v');
  });

  test('text wraps to the page width', () => {
    const width = PAGE.width - PAGE.margin * 2;
    const lines = wrap('word '.repeat(200), 'F1', 11, width);
    expect(lines.length).toBeGreaterThan(5);
    lines.forEach((l) => expect(textWidth(l, 'F1', 11)).toBeLessThanOrEqual(width));
    expect(textWidth('WWW', 'F2', 10)).toBeCloseTo(3 * 0.944 * 10, 5);
  });

  test('a long document flows onto new pages and never writes below the bottom margin', () => {
    const doc = createPdf({ title: 'Long', footer: 'Footer' });
    for (let i = 0; i < 120; i++) doc.paragraph(`Paragraph ${i} with enough words to wrap across the line at least once on a Letter page.`);
    const bytes = doc.toBytes();
    expect(checkPdf(bytes)).toBeGreaterThan(3);
    const ys = [...latin1(bytes).matchAll(/BT \/F\d [\d.]+ Tf [\d. ]+ rg ([\d.]+) ([\d.]+) Td \((.*?)\) Tj ET/g)];
    for (const [, , y, t] of ys) if (!t.startsWith('Footer')) expect(Number(y)).toBeGreaterThanOrEqual(PAGE.margin);
    expect(latin1(bytes)).toContain('(Footer \\267 page 2 of');
  });
});
