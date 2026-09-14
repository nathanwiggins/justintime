const DocIngest = (() => {
  const DOLLAR_REGEX = /\$[\d,]+(?:\.\d{2})?/g;
  const BATCH_SIZE = 25;

  function blockKindForTag(tag) {
    if (tag === 'h1' || tag === 'h2') return 'heading';
    if (tag === 'h3' || tag === 'h4') return 'subheading';
    return 'paragraph';
  }

  function tokenizeText(text) {
    const parts = [];
    const values = [];
    let lastIndex = 0;
    let match;
    DOLLAR_REGEX.lastIndex = 0;
    while ((match = DOLLAR_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index) });
      parts.push({ dollarSlot: values.length });
      values.push(parseFloat(match[0].replace(/[$,]/g, '')));
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });
    return { parts, values };
  }

  async function parseIntoBlocks(file) {
    const arrayBuffer = await file.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
    const dom = new DOMParser().parseFromString(html, 'text/html');

    const rawBlocks = [];
    const dollarItems = [];

    [...dom.body.children].forEach(el => {
      const text = (el.textContent || '').trim();
      if (!text) return;
      const { parts, values } = tokenizeText(text);
      values.forEach(value => dollarItems.push({ value, context: text }));
      rawBlocks.push({ kind: blockKindForTag(el.tagName.toLowerCase()), parts });
    });

    return { rawBlocks, dollarItems };
  }

  async function resolveValues(dollarItems, sheets, csvText, apiKey) {
    const claimed = new Set();
    const nodes = {};

    const unresolved = [];
    dollarItems.forEach((item, i) => {
      const id = `upload.v${i}`;
      const cell = ValueGraph.matchAmountToCell(sheets, item.value, claimed, item.context);
      if (cell) {
        nodes[id] = { id, kind: 'linked', amount: item.value, link: { sheet: cell.sheet, row: cell.row, col: cell.col, lastKnownValue: item.value }, formula: null, broken: false };
      } else {
        nodes[id] = { id, kind: 'plain', amount: item.value, link: null, formula: null, broken: false };
        unresolved.push({ id, value: item.value, context: item.context });
      }
      item.id = id;
    });

    if (unresolved.length && apiKey) {
      for (let i = 0; i < unresolved.length; i += BATCH_SIZE) {
        const batch = unresolved.slice(i, i + BATCH_SIZE).map(u => ({ label: u.id, value: u.value, context: u.context }));
        let matched;
        try {
          matched = await Api.matchValuesBatch(batch, csvText, apiKey);
        } catch {
          continue;
        }
        matched.forEach(m => {
          if (m.spreadsheet_value === undefined) return;
          const node = nodes[m.label];
          if (!node || !ValueGraph.cellMatches(String(m.spreadsheet_value), node.amount)) return;
          const cell = ValueGraph.matchAmountToCell(sheets, m.spreadsheet_value, claimed, m.label);
          if (!cell) return;
          node.kind = 'linked';
          node.link = { sheet: cell.sheet, row: cell.row, col: cell.col, lastKnownValue: node.amount };
        });
      }
    }

    return nodes;
  }

  async function ingest({ file, sheets, csvText, apiKey }) {
    const { rawBlocks, dollarItems } = await parseIntoBlocks(file);
    const nodes = await resolveValues(dollarItems, sheets, csvText, apiKey);

    let cursor = 0;
    const blocks = rawBlocks.map(b => ({
      kind: b.kind,
      parts: b.parts.map(p => ('text' in p ? p : { valueId: dollarItems[cursor++].id }))
    }));

    return { blocks, valueGraph: { nodes } };
  }

  return { ingest };
})();
