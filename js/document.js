const Document = (() => {
  let _docx = null;

  async function requireDocx() {
    if (!_docx) _docx = await import('https://esm.sh/docx@8.5.0');
    return _docx;
  }

  const OUTPUT_FILENAMES = {
    'nsf':     'NSF_Budget_Justification.docx',
    'general': 'General_Budget_Justification.docx'
  };

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  const BLOCK_STYLE = {
    title:      { align: 'center', bold: true, allCaps: true, size: 28, after: 80 },
    subtitle:   { align: 'center', italics: true, size: 22, after: 240 },
    heading:    { bold: true, size: 26, before: 280, after: 120 },
    subheading: { bold: true, size: 24, before: 160, after: 80 },
    paragraph:  { size: 22, after: 100 }
  };

  function partsToRuns(parts, valueGraph, runStyle) {
    const { TextRun } = _docx;
    return (parts || []).map(part => {
      if ('text' in part) return new TextRun({ text: part.text, ...runStyle });
      const node = valueGraph.nodes[part.valueId];
      return new TextRun({ text: `$${fmt(node ? node.amount : 0)}`, ...runStyle });
    });
  }

  function blockToParagraph(block, valueGraph) {
    const { Paragraph, AlignmentType } = _docx;
    const style = BLOCK_STYLE[block.kind] || BLOCK_STYLE.paragraph;
    const runStyle = {};
    if (style.bold)    runStyle.bold    = true;
    if (style.italics) runStyle.italics = true;
    if (style.allCaps) runStyle.allCaps = true;
    if (style.size)    runStyle.size    = style.size;

    return new Paragraph({
      alignment: style.align === 'center' ? AlignmentType.CENTER : undefined,
      children:  partsToRuns(block.parts, valueGraph, runStyle),
      spacing:   { before: style.before || 0, after: style.after || 0 }
    });
  }

  async function generate(templateType, blocks, valueGraph) {
    await requireDocx();
    const { Document: DocxDocument, Packer } = _docx;

    const doc = new DocxDocument({
      styles: {
        default: {
          document: {
            run: { font: 'Arial', size: 22 }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: blocks.map(b => blockToParagraph(b, valueGraph))
      }]
    });
    const blob     = await Packer.toBlob(doc);
    const fileName = OUTPUT_FILENAMES[templateType] || 'Budget_Justification.docx';

    const url  = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href     = url;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    return { blob, fileName };
  }

  return { generate };
})();
