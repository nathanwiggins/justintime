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

  function splitAndHighlight(open, content, matchStr, color) {
    const rPrBlock = (content.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];

    let highlightedRPr;
    if (rPrBlock) {
      highlightedRPr = rPrBlock.includes('<w:highlight')
        ? rPrBlock
        : rPrBlock.replace('<w:rPr>', `<w:rPr><w:highlight w:val="${color}"/>`);
    } else {
      highlightedRPr = `<w:rPr><w:highlight w:val="${color}"/></w:rPr>`;
    }

    const text = getRunText(content);
    const idx  = text.indexOf(matchStr);
    if (idx === -1) return null;

    const before = text.slice(0, idx);
    const after  = text.slice(idx + matchStr.length);

    const makeT = t => {
      const preserve = t.startsWith(' ') || t.endsWith(' ');
      return `<w:t${preserve ? ' xml:space="preserve"' : ''}>${t}</w:t>`;
    };

    let result = '';
    if (before) result += `${open}${rPrBlock}${makeT(before)}</w:r>`;
    result += `${open}${highlightedRPr}${makeT(matchStr)}</w:r>`;
    if (after)  result += `${open}${rPrBlock}${makeT(after)}</w:r>`;

    return result;
  }

  function applyHighlights(xml, items) {
    const sorted = [...items].sort((a, b) => (a.color === 'red' ? -1 : 1));

    return xml.replace(/(<w:p\b[^>]*>)([\s\S]*?)(<\/w:p>)/g, (paraMatch, paraOpen, paraContent, paraClose) => {
      const paraText = [...paraContent.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
        .map(m => m[1]).join('');

      if (!paraText) return paraMatch;

      const applicable = sorted.filter(({ context, variants }) =>
        context ? paraText.includes(context) : variants.some(v => paraText.includes(v))
      );

      if (!applicable.length) return paraMatch;

      const updatedContent = paraContent.replace(/(<w:r(?:\s[^>]*)?>)([\s\S]*?)(<\/w:r>)/g, (match, open, content, close) => {
        const text = getRunText(content);
        if (!text) return match;

        for (const { variants, color } of applicable) {
          const variant = variants.find(v => text.includes(v));
          if (!variant) continue;

          if (text === variant) {
            return open + injectHighlight(content, color) + close;
          }

          return splitAndHighlight(open, content, variant, color)
            || (open + injectHighlight(content, color) + close);
        }
        return match;
      });

      return paraOpen + updatedContent + paraClose;
    });
  }

  async function download(file, extracted, comparison) {
    const contextMap = new Map((extracted || []).map(e => [e.label, e.context]));

    const items = comparison
      .map(c => {
        const color = !c.found_in_spreadsheet ? 'yellow'
          : !isValueMatch(c.justification_value, c.spreadsheet_value) ? 'red'
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
