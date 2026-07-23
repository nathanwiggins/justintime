const DocPreview = (() => {

  async function extractHtml(file) {
    if (!file || !/\.docx$/i.test(file.name)) return null;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  }

  function render(container, html) {
    container.innerHTML = html || '<p class="doc-preview-empty">Preview isn\'t available for this file type — only .docx uploads can be previewed here.</p>';
  }

  function wrapVariant(textNode, variant, item) {
    const idx = textNode.nodeValue.indexOf(variant);
    if (idx === -1) return false;

    const matchNode = textNode.splitText(idx);
    matchNode.splitText(variant.length);

    const mark = document.createElement('mark');
    mark.className = `doc-highlight ${item.color}`;
    mark.dataset.label = item.label;
    matchNode.parentNode.insertBefore(mark, matchNode);
    mark.appendChild(matchNode);
    return true;
  }

  function highlightBlock(block, applicable) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(textNode => {
      for (const item of applicable) {
        const variant = item.variants.find(v => textNode.nodeValue.includes(v));
        if (variant && wrapVariant(textNode, variant, item)) return;
      }
    });
  }

  function highlightItems(container, items) {
    const sorted = [...items].sort((a, b) => (a.color === 'red' ? -1 : 1));
    const blocks = container.querySelectorAll('p, li, td, h1, h2, h3');
    blocks.forEach(block => {
      const blockText = block.textContent;
      const applicable = sorted.filter(item => item.context && Highlighter.contextMatches(blockText, item.context));
      if (applicable.length) highlightBlock(block, applicable);
    });
  }

  function setActive(container, labels) {
    const activeSet = new Set(labels);
    let first = null;
    container.querySelectorAll('.doc-highlight').forEach(mark => {
      const isActive = activeSet.has(mark.dataset.label);
      mark.classList.toggle('active', isActive);
      if (isActive && !first) first = mark;
    });
    if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  return { extractHtml, render, highlightItems, setActive };
})();
