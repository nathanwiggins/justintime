const VerifierTab = (() => {
  let justificationFile = null;
  let budgetFile        = null;

  function setStatus(msg, type = '') {
    const el       = document.getElementById('verify-status');
    el.textContent = msg;
    el.className   = 'status-message' + (type ? ' ' + type : '');
  }

  function setRunning(active) {
    document.getElementById('verify-btn').disabled = active;
    document.getElementById('verify-loading').classList.toggle('hidden', !active);
  }

  function formatCurrency(value) {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function isMatch(a, b) {
    if (a === b) return true;
    const diff = Math.abs(a - b);
    return diff <= 1 || diff / Math.max(Math.abs(a), Math.abs(b)) <= 0.01;
  }

  function renderResults(items) {
    const container = document.getElementById('verify-results');
    container.innerHTML = '';

    const matched  = items.filter(i => i.found_in_spreadsheet && isMatch(i.justification_value, i.spreadsheet_value));
    const mismatch = items.filter(i => i.found_in_spreadsheet && !isMatch(i.justification_value, i.spreadsheet_value));
    const notFound = items.filter(i => !i.found_in_spreadsheet);

    const summary = document.createElement('div');
    summary.className = 'verify-summary';
    summary.innerHTML =
      `<span class="verify-summary-chip match">${matched.length} matched</span>` +
      `<span class="verify-summary-chip mismatch">${mismatch.length} mismatched</span>` +
      `<span class="verify-summary-chip notfound">${notFound.length} not found</span>`;
    container.appendChild(summary);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'verify-table-wrap';

    const table = document.createElement('table');
    table.className = 'verify-table';
    table.innerHTML =
      '<thead><tr>' +
        '<th>Label</th>' +
        '<th>Justification</th>' +
        '<th>Spreadsheet</th>' +
        '<th>Status</th>' +
      '</tr></thead>';

    const tbody = document.createElement('tbody');

    for (const item of items) {
      let statusLabel, statusClass, spreadsheetDisplay;

      if (!item.found_in_spreadsheet) {
        statusLabel       = 'Not found';
        statusClass       = 'notfound';
        spreadsheetDisplay = '—';
      } else if (isMatch(item.justification_value, item.spreadsheet_value)) {
        statusLabel       = 'Match';
        statusClass       = 'match';
        spreadsheetDisplay = formatCurrency(item.spreadsheet_value);
      } else {
        statusLabel       = 'Mismatch';
        statusClass       = 'mismatch';
        spreadsheetDisplay = formatCurrency(item.spreadsheet_value);
      }

      const tr = document.createElement('tr');
      tr.className = `verify-row-${statusClass}`;
      tr.innerHTML =
        `<td class="verify-cell-label">${item.label}</td>` +
        `<td class="verify-cell-value">${formatCurrency(item.justification_value)}</td>` +
        `<td class="verify-cell-value">${spreadsheetDisplay}</td>` +
        `<td><span class="verify-badge ${statusClass}">${statusLabel}</span></td>`;
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);
    container.classList.remove('hidden');
  }

  async function handleVerify() {
    const apiKey = Settings.loadApiKey();
    if (!apiKey)            { setStatus('No API key saved. Go to the Settings tab and save your Gemini API key.', 'error'); return; }
    if (!justificationFile) { setStatus('Please upload a budget justification document.', 'error'); return; }
    if (!budgetFile)        { setStatus('Please upload a budget spreadsheet.', 'error'); return; }

    setRunning(true);
    setStatus('');
    document.getElementById('verify-results').classList.add('hidden');

    try {
      if (justificationFile.name.toLowerCase().endsWith('.doc') && !justificationFile.name.toLowerCase().endsWith('.docx')) {
        throw new Error('Legacy .doc files cannot be parsed in the browser. Please re-save as .docx and re-upload.');
      }
      const buffer = await justificationFile.arrayBuffer();
      const mammothResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      if (!mammothResult.value.trim()) throw new Error('Budget justification document appears to be empty.');
      const justificationText = mammothResult.value.trim();

      const { csvText } = await Parser.parse(budgetFile);

      const comparison = await Verifier.run(justificationText, csvText, apiKey);
      renderResults(comparison);
    } catch (err) {
      setStatus('Error: ' + err.message, 'error');
    } finally {
      setRunning(false);
    }
  }

  function initDropZone(zoneId, inputId, filenameId, onFile) {
    const zone     = document.getElementById(zoneId);
    const input    = document.getElementById(inputId);
    const filename = document.getElementById(filenameId);

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      onFile(file);
      filename.textContent = file.name;
      filename.classList.remove('hidden');
    });

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      onFile(file);
      filename.textContent = file.name;
      filename.classList.remove('hidden');
    });
  }

  function init() {
    initDropZone(
      'verify-justification-drop-zone',
      'verify-justification-input',
      'verify-justification-filename',
      file => { justificationFile = file; }
    );
    initDropZone(
      'verify-budget-drop-zone',
      'verify-budget-input',
      'verify-budget-filename',
      file => { budgetFile = file; }
    );
    document.getElementById('verify-btn').addEventListener('click', handleVerify);
  }

  return { init };
})();
