import { coverageLabel } from './report-sections.mjs';

// ASCII PDF streams with WinAnsi octal escapes preserve French text through the text store.
const extraCharacters = { '€': 128, 'Œ': 140, 'œ': 156, '‘': 145, '’': 146, '“': 147, '”': 148, '–': 150, '—': 151, '…': 133, ' ': 32, ' ': 32, ' ': 32 };
const labeled = (label, value) => value ? `${label} · ${value}` : '';
const factText = fact => {
  const references = (fact.sources ?? [fact.source]).filter(Boolean);
  return `${fact.label ? fact.label + ' — ' : ''}${fact.text}${references.length ? ` [${references.join(', ')}]` : ''}`;
};
function pdfString(value) {
  return [...String(value ?? '')].map(char => {
    if (char === '→') return '->';
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
    current = { commands: [], links: [], images: [] }; pages.push(current); y = 756;
    draw('ANCRAGE', margin, 796, 9, 'F2', '.21 .34 .24');
    draw(document.date, 385, 796, 9, 'F1', '.32 .38 .34');
    if (pages.length > 1) {
      const nameLines = wrap(document.name, right - margin, 10);
      nameLines.forEach((line, index) => draw(line, margin, 773 - index * 14, 10, 'F2'));
      y = 744 - (nameLines.length - 1) * 14;
    }
  };
  const ensure = height => { if (y - height < bottom) newPage(); };
  const textHeight = (value, size, indent = 0, gap = 7) =>
    value ? wrap(value, right - margin - indent, size).length * size * 1.4 + gap : 0;
  const seoValue = edit => edit.current ? labeled(...edit.current) : '';
  const seoEditHeight = edit => textHeight(edit.label, 10, 10, 3) + textHeight(seoValue(edit), 9.5, 10, 3)
    + textHeight(edit.text, 10.5, 10, 3) + textHeight(edit.reason, 9.5, 10, 9);
  const seoTitle = block => block.title + (block.source ? ` [${block.source}]` : '');
  const seoLeadHeight = block => Math.min(275, Math.max(70,
    14 + textHeight(seoTitle(block), 12) + textHeight(block.assessment, 10.5)
      + block.checks.reduce((height, check) => height + textHeight(check, 10.5, 10, 6), 0)
      + (block.edits.length ? seoEditHeight(block.edits[0]) : 0)));
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
      paragraph(factText(fact), { indent: 10, gap: 6 });
    }
  };
  const renderVisuals = (visuals = []) => {
    const available = visuals.filter(item => item.jpeg);
    if (available.length) {
      const tileWidth = available.length > 1 ? (right - margin - 16) / 2 : 235;
      const tiles = available.map(image => {
        const height = Math.min(170, tileWidth * image.height / image.width);
        const caption = `${image.caption} · ${image.date}${image.viewportWidth ? ` · ${image.viewportWidth} px` : ''} [${image.source}]`;
        return { image, height, width: height * image.width / image.height, lines: wrap(caption, tileWidth, 8.5) };
      });
      const rowHeight = Math.max(...tiles.map(tile => tile.height + tile.lines.length * 11 + 13));
      ensure(rowHeight);
      tiles.forEach((tile, index) => {
        const x = margin + (tileWidth + 16) * index;
        const name = `Im${current.images.length + 1}`;
        current.images.push({ name, ...tile.image });
        current.commands.push(`q ${tile.width.toFixed(2)} 0 0 ${tile.height.toFixed(2)} ${x} ${(y - tile.height).toFixed(2)} cm /${name} Do Q`);
        tile.lines.forEach((line, lineIndex) => draw(line, x, y - tile.height - 10 - lineIndex * 11, 8.5));
      });
      y -= rowHeight;
    }
    for (const item of visuals.filter(visual => visual.missing)) paragraph(`Capture à réaliser · ${item.missing}${item.source ? ` [${item.source}]` : ''}`, { size: 9 });
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
  const nameLines = wrap(document.name, right - margin - 40, 30);
  const mastheadHeight = 88 + nameLines.length * 36;
  current.commands.push(`.09 .22 .16 rg ${margin} ${y - mastheadHeight + 28} ${right - margin} ${mastheadHeight - 24} re f`);
  const coverTop = y;
  const coverColor = '.93 .96 .91';
  y -= 32;
  for (const line of nameLines) { draw(line, margin + 20, y, 30, 'F3', coverColor); y -= 36; }
  draw([document.title, document.city].filter(Boolean).join(' · '), margin + 20, y + 6, 11, 'F1', coverColor);
  y = coverTop - mastheadHeight + 12;
  const destinations = new Map();
  if (document.sections.some(section => section.id === 'seo')) {
    paragraph('Sommaire', { size: 9, font: 'F2', gap: 3 });
    let x = margin;
    for (const [index, section] of document.sections.entries()) {
      if (!section.blocks.length) continue;
      const linkWidth = width(section.title, 9.5);
      if (x + linkWidth > right) { x = margin; y -= 16; }
      draw(section.title, x, y, 9.5, section.id === 'seo' ? 'F2' : 'F1', '.21 .34 .24');
      current.links.push({ rect: [x, y - 3, x + linkWidth, y + 10], section: index });
      x += linkWidth + 16;
    }
    y -= 22;
  }
  for (const [sectionIndex, section] of document.sections.entries()) {
    if (!section.blocks.length) continue;
    if (section.blocks[0]?.type === 'table') ensure(140);
    if (section.id === 'seo') {
      ensure(40 + seoLeadHeight(section.blocks[0]));
      current.commands.push(`.93 .95 .92 rg ${margin} ${y - 27} ${right - margin} 38 re f`);
      draw(section.title, margin + 12, y - 13, 16, 'F2', '.14 .29 .19');
      destinations.set(sectionIndex, { page: pages.length - 1, top: y + 12 });
      y -= 40;
    } else {
      ensure(85);
      destinations.set(sectionIndex, { page: pages.length - 1, top: y + 8 });
      heading(section.title);
    }
    for (const block of section.blocks) {
      if (block.type === 'paragraph') {
        const references = block.sources?.length ? ` [${block.sources.join(', ')}]` : '';
        paragraph(block.text + references, sectionIndex === document.sections.length - 1 ? { size: 9.5, color: '.32 .38 .34' } : sectionIndex === 0 ? { size: 13 } : {});
      }
      if (block.type === 'facts') facts(block.items);
      if (block.type === 'action') {
        const meta = [block.basis, block.confidence, block.owner, block.effort].filter(Boolean).join(' · ');
        const steps = [
          block.impact, labeled('À faire', block.action), labeled('Texte proposé', block.example),
          labeled('Bouton proposé', block.callToAction), labeled('Pour vérifier', block.verification),
        ].filter(Boolean);
        const otherSources = (block.sources ?? []).filter(number => !block.facts?.some(fact => (fact.sources ?? [fact.source]).includes(number)));
        const refs = otherSources.length ? `Sources [${otherSources.join(', ')}]` : '';
        const estimated = textHeight(block.title, 12) + 11 + textHeight(meta, 9)
          + textHeight(block.targetUrl, 8.5, 0, 3)
          + steps.reduce((sum, value) => sum + textHeight(value, 10.5), 0)
          + textHeight(block.limitation, 9.5) + textHeight(refs, 9.5)
          + (block.facts ?? []).reduce((sum, fact) => sum + textHeight(factText(fact), 10.5, 10, 6), 0);
        if (estimated < 640) ensure(estimated);
        heading(block.title, 3);
        if (meta) paragraph(meta, { size: 9, font: 'F2', color: '.21 .34 .24' });
        if (block.targetUrl) {
          for (const line of wrap(block.targetUrl, right - margin, 8.5)) {
            ensure(14); draw(line, margin, y, 8.5, 'F1', '.21 .34 .24');
            current.links.push({ rect: [margin, y - 2, right, y + 10], url: block.targetUrl }); y -= 13;
          }
          y -= 3;
        }
        for (const step of steps) paragraph(step);
        if (block.limitation) paragraph(block.limitation, { size: 9.5, color: '.32 .38 .34' });
        facts(block.facts);
        if (refs) paragraph(refs, { size: 9.5, color: '.32 .38 .34' });
        renderVisuals(block.visuals);
        y -= 6;
      }
      if (block.type === 'comparison') {
        if (block.visuals?.some(visual => visual.jpeg)) ensure(245 + wrap(block.text, right - margin, 10.5).length * 15);
        heading(block.title, 3);
        if (block.subject) paragraph(block.subject, { size: 9.5, font: 'F2' });
        paragraph(`${block.text}${(block.sources ?? [block.source]).filter(Boolean).map(source => ` [${source}]`).join('')}`);
        renderVisuals(block.visuals);
        if (block.next) paragraph(`${block.nextLabel} · ${block.next}`);
        if (block.reason) paragraph(labeled(block.reasonLabel || 'Pourquoi', block.reason));
      }
      if (block.type === 'seo-page') {
        ensure(seoLeadHeight(block));
        rule(y + 5);
        heading(seoTitle(block), 3);
        if (block.intent) paragraph(labeled('Intention', block.intent), { font: 'F2', size: 9.5 });
        if (block.assessment) paragraph(block.assessment);
        facts(block.checks.map(text => ({ text })));
        for (const [label, value] of block.values) {
          const row = labeled(label, value);
          ensure(wrap(row, right - margin, 9.5).length * 13.3 + 5);
          paragraph(row, { size: 9.5, gap: 5 });
        }
        for (const edit of block.edits) {
          const indent = 10;
          const observed = seoValue(edit);
          ensure(seoEditHeight(edit));
          paragraph(edit.label, { font: 'F2', size: 10, indent, gap: 3, color: '.14 .29 .19' });
          if (observed) paragraph(observed, { size: 9.5, indent, gap: 3, color: '.32 .38 .34' });
          paragraph(edit.text, { indent, gap: 3 });
          if (edit.reason) paragraph(edit.reason, { size: 9.5, indent, gap: 9, color: '.32 .38 .34' });
        }
      }
      if (block.type === 'coverage') {
        ensure(100);
        paragraph(block.title, { size: 11, font: 'F2' });
        const cellWidth = (right - margin) / block.items.length;
        block.items.forEach((item, index) => {
          const x = margin + index * cellWidth;
          current.commands.push(`.83 .86 .82 RG .7 w ${x} ${y - 32} ${cellWidth - 12} 42 re S`);
          draw(item.label, x + 8, y - 5, 10, 'F2');
          draw(coverageLabel(item.status), x + 8, y - 20, 8.5);
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
  let nextPageId = objects.length + 1;
  const pageIds = pages.map(page => {
    const id = nextPageId;
    nextPageId += 2 + page.links.length + page.images.length;
    return id;
  });
  const kids = [];
  for (const page of pages) {
    const pageId = objects.length + 1; const streamId = pageId + 1;
    const annotationIds = page.links.map((_, index) => streamId + 1 + index);
    const images = page.images.map((item, index) => `/${item.name} ${streamId + 1 + page.links.length + index} 0 R`).join(' ');
    kids.push(`${pageId} 0 R`);
    const commands = page.commands.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>${images ? ` /XObject << ${images} >>` : ''} >> /Contents ${streamId} 0 R /Annots [${annotationIds.map(id => `${id} 0 R`).join(' ')}] >>`);
    objects.push(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
    for (const link of page.links) {
      const target = destinations.get(link.section);
      const action = target ? `/Dest [${pageIds[target.page]} 0 R /XYZ null ${target.top} null]` : `/A << /S /URI /URI (${pdfString(link.url)}) >>`;
      objects.push(`<< /Type /Annot /Subtype /Link /Rect [${link.rect.join(' ')}] /Border [0 0 0] ${action} >>`);
    }
    for (const image of page.images) {
      const payload = Buffer.from(image.jpeg, 'base64').toString('hex') + '>';
      objects.push(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${payload.length} >>\nstream\n${payload}\nendstream`);
    }
  }
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`;
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  return pdf + `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}
