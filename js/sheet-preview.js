const SheetPreview = (() => {

  function cellMatches(cellText, value) {
    const cleaned = String(cellText).replace(/[$,]/g, '').trim();
    if (cleaned === '') return false;
    const num = parseFloat(cleaned);
    if (Number.isNaN(num)) return false;
    const diff = Math.abs(num - value);
    return diff <= 1 || diff / Math.max(Math.abs(num), Math.abs(value), 1) <= 0.01;
  }

  async function extractSheets(file) {
    if (!file) return [];
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    return wb.SheetNames.map(name => ({ name, html: XLSX.utils.sheet_to_html(wb.Sheets[name]) }));
  }

  function render(container, sheets, activeName) {
    const sheet = sheets.find(s => s.name === activeName) || sheets[0];
    container.innerHTML = sheet ? sheet.html : '<p class="doc-preview-empty">No spreadsheet data to preview.</p>';
  }

  function highlightItems(container, items) {
    container.querySelectorAll('td').forEach(cell => {
      const match = items.find(item => item.spreadsheet_value !== undefined && cellMatches(cell.textContent, item.spreadsheet_value));
      if (!match) return;
      cell.classList.add('doc-highlight', match.color);
      cell.dataset.label = match.label;
    });
  }

  function mapItemsToSheets(sheets, items) {
    const map = new Map();
    const parser = new DOMParser();
    items.forEach(item => {
      if (item.spreadsheet_value === undefined) return;
      for (const sheet of sheets) {
        const doc = parser.parseFromString(sheet.html, 'text/html');
        const hit = [...doc.querySelectorAll('td')].some(td => cellMatches(td.textContent, item.spreadsheet_value));
        if (hit) { map.set(item.label, sheet.name); break; }
      }
    });
    return map;
  }

  return { extractSheets, render, highlightItems, mapItemsToSheets };
})();
