// ASCII PDF streams with WinAnsi octal escapes preserve French text through the text store.
const extraCharacters = { '€': 128, 'Œ': 140, 'œ': 156, '‘': 145, '’': 146, '“': 147, '”': 148, '–': 150, '—': 151, '…': 133, ' ': 32, ' ': 32 };
function pdfString(value) {
  return [...String(value ?? '')].map(char => {
    const code = extraCharacters[char] ?? char.charCodeAt(0);
    if (code > 255) return '?';
    if (code < 32 || code > 126) return `\\${code.toString(8).padStart(3, '0')}`;
    return /[\\()]/.test(char) ? `\\${char}` : char;
  }).join('');
}

function width(text, size) {
  return [...text].reduce((sum, char) => sum + (/[ilI.,:;'’!| ]/.test(char) ? .28 : /[MW@%Œœ]/.test(char) ? .9 : /[A-Z]/.test(char) ? .69 : .56) * size, 0);
}

function wrap(value, maxWidth, size) {
  const lines = []; let line = '';
  for (const word of String(value ?? '').split(/\s+/)) {
    if (line && width(`${line} ${word}`, size) > maxWidth) { lines.push(line); line = ''; }
    if (width(word, size) > maxWidth) {
      for (const char of word) {
        if (width(line + char, size) > maxWidth) { lines.push(line); line = ''; }
        line += char;
      }
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function renderAuditDocumentPdf(document) {
  const pages = []; const margin = 50; const right = 545; const bottom = 58;
  let current; let y;
  const draw = (value, x, baseline, size = 10.5, font = 'F1', color = '.094 .145 .118') => {
    current.commands.push(`BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${baseline} Tm (${pdfString(value)}) Tj ET`);
  };
  const rule = baseline => current.commands.push(`.83 .86 .82 RG .5 w ${margin} ${baseline} m ${right} ${baseline} l S`);
  const newPage = () => {
    current = { commands: [], links: [] }; pages.push(current); y = 756;
    draw('ANCRAGE', margin, 796, 9, 'F2', '.21 .34 .24');
    draw(document.date, 385, 796, 9, 'F1', '.32 .38 .34');
    if (pages.length > 1) {
      const nameLines = wrap(document.name, right - margin, 10);
      nameLines.forEach((line, index) => draw(line, margin, 773 - index * 14, 10, 'F2'));
      y = 744 - (nameLines.length - 1) * 14;
    }
  };
  const ensure = height => { if (y - height < bottom) newPage(); };
  const paragraph = (value, { size = 10.5, font = 'F1', color, indent = 0, gap = 7 } = {}) => {
    const lines = wrap(value, right - margin - indent, size);
    for (const line of lines) { ensure(size * 1.4); draw(line, margin + indent, y, size, font, color); y -= size * 1.4; }
    y -= gap;
  };
  const heading = (value, level = 2) => {
    ensure(level === 2 ? 85 : 70);
    y -= level === 2 ? 8 : 5;
    paragraph(value, { size: level === 2 ? 15 : 12, font: 'F2', gap: 7 });
  };
  const facts = items => {
    for (const fact of items ?? []) {
      const references = (fact.sources ?? [fact.source]).filter(Boolean);
      paragraph(`${fact.text}${references.length ? ` [${references.join(', ')}]` : ''}`, { indent: 10, gap: 6 });
    }
  };
  function renderTable(block) {
    ensure(95); paragraph(block.title, { size: 11, font: 'F2' });
    const columnWidth = (right - margin) / block.columns.length;
    const row = (values, header = false) => {
      const cells = values.map(value => wrap(value, columnWidth - 16, header ? 9 : 10));
      const height = Math.max(...cells.map(lines => lines.length)) * 14 + 16;
      if (height < 660) {
        if (y - height - 6 < bottom) {
          newPage();
          if (!header) row(block.columns, true);
        }
        if (header) current.commands.push(`.95 .96 .94 rg ${margin} ${y - height + 10} ${right - margin} ${height} re f`);
        cells.forEach((lines, index) => lines.forEach((line, lineIndex) => draw(line, margin + index * columnWidth + 7, y - lineIndex * 14, header ? 9 : 10, header ? 'F2' : 'F1')));
        y -= height; rule(y + 7);
      } else {
        values.forEach((value, index) => paragraph(`${block.columns[index]} : ${value}`));
      }
    };
    row(block.columns, true);
    for (const values of block.rows) row(values);
    y -= 8;
  }
  newPage();
  paragraph(document.name, { size: 27, font: 'F3', gap: 8 });
  if (document.city) paragraph(document.city, { size: 11, gap: 6 });
  paragraph(document.title, { size: 11, font: 'F2', gap: 12 });
  rule(y); y -= 12;
  for (const [sectionIndex, section] of document.sections.entries()) {
    if (section.blocks[0]?.type === 'table') ensure(140);
    heading(section.title);
    for (const block of section.blocks) {
      if (block.type === 'paragraph') paragraph(block.text, sectionIndex === 3 ? { size: 9.5, color: '.32 .38 .34' } : {});
      if (block.type === 'facts') facts(block.items);
      if (block.type === 'action') {
        const estimated = wrap(block.title, 495, 12).length * 18 + (block.facts ?? []).reduce((sum, fact) => sum + wrap(fact.text, 485, 10.5).length * 16 + 6, 0) + wrap(block.impact, 495, 10.5).length * 16 + wrap(block.action, 495, 10.5).length * 16 + 70;
        if (estimated < 640) ensure(estimated);
        heading(`${block.title}${!block.facts?.length && block.sources?.length ? ` [${block.sources.join(', ')}]` : ''}`, 3); facts(block.facts);
        paragraph(`Pour vos clients : ${block.impact}`);
        paragraph(`À faire : ${block.action}`, { gap: 14 });
      }
      if (block.type === 'comparison') { heading(block.title, 3); paragraph(`${block.text}${block.source ? ` [${block.source}]` : ''}`); }
      if (block.type === 'coverage') {
        ensure(100);
        paragraph(block.title, { size: 11, font: 'F2' });
        const cellWidth = (right - margin) / block.items.length;
        block.items.forEach((item, index) => {
          const x = margin + index * cellWidth;
          current.commands.push(`.83 .86 .82 RG .7 w ${x} ${y - 32} ${cellWidth - 12} 42 re S`);
          draw(item.label, x + 8, y - 5, 10, 'F2');
          draw(item.status === 'SUCCEEDED' ? 'Collecte effectuée' : item.status === 'BLOCKED' ? 'Collecte indisponible' : 'Collecte partielle', x + 8, y - 20, 8.5);
        });
        y -= 52;
      }
      if (block.type === 'table') renderTable(block);
      if (block.type === 'source') {
        ensure(38);
        for (const line of wrap(`[${block.number}] ${block.url}`, 495, 8.5)) {
          ensure(14); draw(line, margin, y, 8.5, 'F1', '.21 .34 .24');
          current.links.push({ rect: [margin, y - 2, right, y + 10], url: block.url }); y -= 13;
        }
        y -= 10;
      }
    }
  }
  pages.forEach((page, index) => { current = page; rule(40); draw(`Ancrage · ${index + 1} / ${pages.length}`, margin, 25, 8, 'F1', '.32 .38 .34'); });
  const objects = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>'];
  const kids = [];
  for (const page of pages) {
    const pageId = objects.length + 1; const streamId = pageId + 1;
    const annotationIds = page.links.map((_, index) => streamId + 1 + index);
    kids.push(`${pageId} 0 R`);
    const commands = page.commands.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${streamId} 0 R /Annots [${annotationIds.map(id => `${id} 0 R`).join(' ')}] >>`);
    objects.push(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
    for (const link of page.links) objects.push(`<< /Type /Annot /Subtype /Link /Rect [${link.rect.join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${pdfString(link.url)}) >> >>`);
  }
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`;
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  return pdf + `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}
