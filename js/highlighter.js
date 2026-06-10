const Highlighter = (() => {

  function isValueMatch(a, b) {
    if (a === b) return true;
    const diff = Math.abs(a - b);
    return diff <= 1 || diff / Math.max(Math.abs(a), Math.abs(b)) <= 0.01;
  }

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

  function injectHighlight(content, color) {
    if (content.includes('<w:highlight')) return content;
    if (content.includes('<w:rPr>')) {
      return content.replace('<w:rPr>', `<w:rPr><w:highlight w:val="${color}"/>`);
    }
    if (/<w:rPr\s*\/>/.test(content)) {
      return content.replace(/<w:rPr\s*\/>/, `<w:rPr><w:highlight w:val="${color}"/></w:rPr>`);
    }
    return content.replace(/(<w:t[ >])/, `<w:rPr><w:highlight w:val="${color}"/></w:rPr>$1`);
  }

  function applyHighlights(xml, items) {
    const sorted = [...items].sort((a, b) => (a.color === 'red' ? -1 : 1));

    return xml.replace(/(<w:r(?:\s[^>]*)?>)([\s\S]*?)(<\/w:r>)/g, (match, open, content, close) => {
      const text = getRunText(content);
      if (!text) return match;

      for (const { variants, color } of sorted) {
        if (variants.some(v => text.includes(v))) {
          return open + injectHighlight(content, color) + close;
        }
      }
      return match;
    });
  }

  async function download(file, extracted, comparison) {
    const contextMap = new Map((extracted || []).map(e => [e.label, e.context]));

    const items = comparison
      .map(c => {
        const color = c.status === 'NOT_FOUND' ? 'yellow'
          : c.status === 'MISMATCH' ? 'red'
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

  return { download };
})();
