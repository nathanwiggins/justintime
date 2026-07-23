const Highlighter = (() => {

  function formatVariants(value) {
    const fmt = (n, dec) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return [...new Set([
      '$' + fmt(value, 2),
      '$' + fmt(value, 0),
      fmt(value, 2),
      fmt(value, 0)
    ])];
  }

  function getRunText(content) {
    return (content.match(/<w:t[^>]*>([^<]*)<\/w:t>/) || [])[1] || '';
  }

  function getParagraphText(paraContent) {
    return (paraContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
      .map(m => (m.match(/<w:t[^>]*>([^<]*)<\/w:t>/) || [])[1] || '')
      .join('');
  }

  function contextMatches(paragraphText, context) {
    const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const p = norm(paragraphText);
    const c = norm(context);
    if (!c || !p) return false;
    return p.includes(c) || c.includes(p) || p.includes(c.slice(0, 40));
  }

  function extractRpr(content) {
    const m = content.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    return m ? m[0] : '';
  }

  function rprWithHighlight(rpr, color) {
    if (rpr) {
      if (rpr.includes('<w:highlight')) return rpr;
      return rpr.replace('<w:rPr>', `<w:rPr><w:highlight w:val="${color}"/>`);
    }
    return `<w:rPr><w:highlight w:val="${color}"/></w:rPr>`;
  }

  function makeRun(open, rpr, text, close) {
    const spaceAttr = (text.startsWith(' ') || text.endsWith(' ')) ? ' xml:space="preserve"' : '';
    return `${open}${rpr}<w:t${spaceAttr}>${text}</w:t>${close}`;
  }

  function splitRunOnVariant(runMatch, open, content, close, variant, color) {
    const tMatch = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
    if (!tMatch) return runMatch;

    const text = tMatch[1];
    if (!text.includes(variant)) return runMatch;

    const rpr   = extractRpr(content);
    const parts = [];
    let remaining = text;
    let idx;

    while ((idx = remaining.indexOf(variant)) !== -1) {
      if (idx > 0) parts.push(makeRun(open, rpr, remaining.slice(0, idx), close));
      parts.push(makeRun(open, rprWithHighlight(rpr, color), variant, close));
      remaining = remaining.slice(idx + variant.length);
    }

    if (remaining) parts.push(makeRun(open, rpr, remaining, close));
    return parts.join('');
  }

  function applyHighlights(xml, items) {
    const sorted = [...items].sort((a, b) => (a.color === 'red' ? -1 : 1));

    return xml.replace(/(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g, (_, paraOpen, paraContent, paraClose) => {
      const paragraphText = getParagraphText(paraContent);
      const applicable    = sorted.filter(item => item.context && contextMatches(paragraphText, item.context));
      if (!applicable.length) return paraOpen + paraContent + paraClose;

      const newContent = paraContent.replace(/(<w:r(?:\s[^>]*)?>)([\s\S]*?)(<\/w:r>)/g, (runMatch, open, content, close) => {
        const text = getRunText(content);
        if (!text) return runMatch;
        for (const { variants, color } of applicable) {
          const matched = variants.find(v => text.includes(v));
          if (matched) return splitRunOnVariant(runMatch, open, content, close, matched, color);
        }
        return runMatch;
      });

      return paraOpen + newContent + paraClose;
    });
  }

  async function download(file, extracted, comparison) {
    const contextMap = new Map((extracted || []).map(e => [e.label, e.context]));

    const items = comparison
      .map(c => {
        const color = c.status === 'NOT_FOUND' ? 'yellow'
          : c.status === 'MISMATCH'  ? 'red'
          : null;
        if (!color) return null;
        return {
          variants: formatVariants(c.justification_value),
          color,
          context: contextMap.get(c.label) || ''
        };
      })
      .filter(Boolean);

    if (!items.length) return;

    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    let xml   = await zip.file('word/document.xml').async('string');

    xml = applyHighlights(xml, items);

    zip.file('word/document.xml', xml);
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'Budget_Justification_Marked.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { download, formatVariants, contextMatches };
})();
