// A small PDF writer for the reports people take away from the site walk: US Letter pages,
// Helvetica, headings, wrapped text, fit bars and a page footer. No library and no print dialog:
// the file is built on the phone in a few milliseconds, so "Download PDF" is one tap.
export const PAGE = { width: 612, height: 792, margin: 54 };
const FOOTER_Y = 30;

export const COLOR = { ink: [0.102, 0.102, 0.102], gray: [0.314, 0.314, 0.314], green: [0, 0.502, 0.216], track: [0.9, 0.9, 0.9], tint: [0.902, 0.949, 0.922] };
const FONT_NAMES = { F1: 'Helvetica', F2: 'Helvetica-Bold', F3: 'Helvetica-Oblique' };

// Standard Helvetica glyph widths (1/1000 em) for character codes 32–126.
const REGULAR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667,
  944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
  278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667,
  944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556,
  333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
// The typographic characters the reports use, in the PDF's WinAnsi encoding.
const WIN_ANSI = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };
const HIGH_WIDTHS = { F1: { 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x97: 1000, 0x85: 1000, 0xb7: 278 },
  F2: { 0x91: 278, 0x92: 278, 0x93: 500, 0x94: 500, 0x95: 350, 0x97: 1000, 0x85: 1000, 0xb7: 278 } };
const SWAP = { '→': '->', '★': '*', '☆': '*', '✓': 'v', ' ': ' ', '\n': ' ', '\t': ' ' };

function codes(str) {
  const out = [];
  for (const ch of String(str ?? '')) {
    if (SWAP[ch]) { for (const c of SWAP[ch]) out.push(c.charCodeAt(0)); continue; }
    const c = ch.codePointAt(0);
    if (c >= 32 && c < 127) out.push(c);
    else if (WIN_ANSI[ch]) out.push(WIN_ANSI[ch]);
    else if (c >= 0xa0 && c <= 0xff) out.push(c);
    else out.push(63);                                     // '?' for anything the font can't show
  }
  return out;
}

// A string ready to go between ( and ) in a PDF content stream.
export function pdfText(str) {
  return codes(str).map((c) => (c === 40 || c === 41 || c === 92 ? `\\${String.fromCharCode(c)}`
    : c > 126 ? `\\${c.toString(8).padStart(3, '0')}` : String.fromCharCode(c))).join('');
}

function charWidth(c, font) {
  const table = font === 'F2' ? BOLD : REGULAR;
  if (c >= 32 && c < 127) return table[c - 32];
  return HIGH_WIDTHS[font === 'F2' ? 'F2' : 'F1'][c] ?? 556;
}
export const textWidth = (str, font, size) => codes(str).reduce((w, c) => w + charWidth(c, font), 0) * size / 1000;

// Greedy word wrap; a word wider than the line is broken by characters.
export function wrap(text, font, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of String(text ?? '').split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, font, size) <= maxWidth) { line = next; continue; }
    if (line) lines.push(line);
    line = '';
    let rest = word;
    while (textWidth(rest, font, size) > maxWidth) {
      let n = rest.length;
      while (n > 1 && textWidth(rest.slice(0, n), font, size) > maxWidth) n--;
      lines.push(rest.slice(0, n)); rest = rest.slice(n);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

const num = (n) => (Math.round(n * 100) / 100).toString();
const rgb = ([r, g, b]) => `${num(r)} ${num(g)} ${num(b)}`;
const pdfDate = (d) => `D:${d.toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z`;

export function createPdf({ title = 'Document', footer = '', date = new Date() } = {}) {
  const { width, height, margin } = PAGE;
  const right = width - margin, content = width - margin * 2;
  const pages = [];
  let ops = null, y = 0;

  function newPage() {
    ops = [];
    pages.push(ops);
    ops.push(`${rgb(COLOR.green)} rg 0 ${height - 8} ${width} 8 re f`);   // brand bar along the top
    y = height - margin;
  }
  const ensure = (h) => { if (!ops || y - h < margin) newPage(); };
  const text = (str, x, at, { font = 'F1', size = 10.5, color = COLOR.ink, spacing = 0 } = {}) => {
    ops.push(`BT /${font} ${num(size)} Tf ${rgb(color)} rg ${spacing ? `${num(spacing)} Tc ` : ''}${num(x)} ${num(at)} Td (${pdfText(str)}) Tj ET`);
  };
  const rect = (x, at, w, h, color) => ops.push(`${rgb(color)} rg ${num(x)} ${num(at)} ${num(w)} ${num(h)} re f`);

  const doc = {
    // Small capitals-style label above a heading.
    kicker(str, { color = COLOR.green } = {}) {
      ensure(16);
      y -= 9;
      text(String(str).toUpperCase(), margin, y, { font: 'F2', size: 8.5, color, spacing: 0.8 });
      y -= 7;
    },
    heading(str, { size = 18, color = COLOR.ink, before = 0, keepWith = 40 } = {}) {
      const lines = wrap(str, 'F2', size, content);
      ensure(before + lines.length * size * 1.2 + keepWith);
      y -= before;
      for (const l of lines) { y -= size; text(l, margin, y, { font: 'F2', size, color }); y -= size * 0.25; }
      y -= 4;
    },
    paragraph(str, { font = 'F1', size = 10.5, color = COLOR.ink, indent = 0, after = 4, accent = false } = {}) {
      const leading = size * 1.35, x = margin + indent + (accent ? 12 : 0);
      for (const l of wrap(str, font, size, content - indent - (accent ? 12 : 0))) {
        ensure(leading);
        if (accent) rect(margin + indent, y - leading + 2, 3, leading, COLOR.green);
        y -= leading;
        text(l, x, y + (leading - size) / 2 + 1, { font, size, color });
      }
      y -= after;
    },
    // A ranked row: bold name on the left, a value on the right, a fit bar underneath.
    row(left, rightText, fraction) {
      ensure(30);
      y -= 12;
      text(left, margin, y, { font: 'F2', size: 11 });
      text(rightText, right - textWidth(rightText, 'F1', 10), y, { size: 10, color: COLOR.gray });
      y -= 9;
      rect(margin, y, content, 5, COLOR.track);
      rect(margin, y, content * Math.max(0, Math.min(1, fraction)), 5, COLOR.green);
      y -= 8;
    },
    rule() { ensure(12); y -= 6; rect(margin, y, content, 0.75, COLOR.track); y -= 6; },
    space(pt) { y -= pt; },
    toBytes() {
      if (!pages.length) newPage();
      const objects = [];
      const add = (body) => { objects.push(body); return objects.length; };
      add('<< /Type /Catalog /Pages 2 0 R >>');
      add('');                                                          // the page tree, filled in below
      Object.values(FONT_NAMES).forEach((f) => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
      add(`<< /Title (${pdfText(title)}) /Producer (Workflow Playbook) /CreationDate (${pdfDate(date)}) >>`);
      const kids = pages.map((pageOps, i) => {
        const stamp = footer ? [`BT /F1 8 Tf ${rgb(COLOR.gray)} rg ${margin} ${FOOTER_Y} Td (${pdfText(`${footer} · page ${i + 1} of ${pages.length}`)}) Tj ET`] : [];
        const stream = [...pageOps, ...stamp].join('\n');
        const contents = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contents} 0 R >>`);
      });
      objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
      let out = '%PDF-1.4\n';
      const offsets = objects.map((body, i) => { const at = out.length; out += `${i + 1} 0 obj\n${body}\nendobj\n`; return at; });
      const xref = out.length;
      out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
      out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      const bytes = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i);
      return bytes;
    },
  };
  return doc;
}
