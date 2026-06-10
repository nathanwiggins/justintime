const VerifierTab = (() => {
  let justificationFile = null;
  let budgetFile        = null;
  let lastExtracted     = null;

  function setStatus(msg, type = '') {
    const el       = document.getElementById('verify-status');
    el.textContent = msg;
    el.className   = 'status-message' + (type ? ' ' + type : '');
  }

  function setRunning(active) {
    document.getElementById('verify-btn').disabled = active;
    document.getElementById('verify-loading').classList.toggle('hidden', !active);
  }

  function clearStepLog() {
    const log    = document.getElementById('verify-step-log');
    const toggle = document.getElementById('verify-log-toggle');
    log.innerHTML = '';
    log.classList.add('hidden');
    toggle.classList.remove('hidden');
    toggle.textContent = 'Show details';
  }

  function addStep(label) {
    const log  = document.getElementById('verify-step-log');
    const item = document.createElement('div');
    item.className = 'step-item running';

    const row  = document.createElement('div');
    row.className = 'step-row';

    const icon = document.createElement('span');
    icon.className   = 'step-icon spinning';
    icon.textContent = '↻';

    const text = document.createElement('span');
    text.className   = 'step-text';
    text.textContent = label;

    row.appendChild(icon);
    row.appendChild(text);
    item.appendChild(row);
    log.appendChild(item);

    function attachDetails(sections) {
      const toggle = document.createElement('button');
      toggle.className   = 'step-toggle';
      toggle.textContent = 'Details ▾';
      row.appendChild(toggle);

      const detail = document.createElement('div');
      detail.className = 'step-detail hidden';

      sections.forEach(({ label: sLabel, content }) => {
        const section = document.createElement('div');
        section.className = 'step-detail-section';

        const heading = document.createElement('div');
        heading.className   = 'step-detail-label';
        heading.textContent = sLabel;

        const pre = document.createElement('pre');
        pre.className   = 'step-detail-pre';
        pre.textContent = content;

        section.appendChild(heading);
        section.appendChild(pre);
        detail.appendChild(section);
      });

      item.appendChild(detail);

      toggle.addEventListener('click', () => {
        const hidden = detail.classList.toggle('hidden');
        toggle.textContent = hidden ? 'Details ▾' : 'Details ▴';
      });
    }

    return {
      done(summary, sections) {
        item.className   = 'step-item done';
        icon.className   = 'step-icon';
        icon.textContent = '✓';
        if (summary) text.textContent = label + ' — ' + summary;
        if (sections && sections.length) attachDetails(sections);
      },
      error(summary) {
        item.className   = 'step-item error';
        icon.className   = 'step-icon';
        icon.textContent = '✗';
        if (summary) text.textContent = label + ' — ' + summary;
      }
    };
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

    const activeFilters = new Set(['match', 'mismatch', 'notfound']);

    const summary = document.createElement('div');
    summary.className = 'verify-summary';

    const chipData = [
      { status: 'match',    label: `${matched.length} matched` },
      { status: 'mismatch', label: `${mismatch.length} mismatched` },
      { status: 'notfound', label: `${notFound.length} not found` }
    ];

    const chips = {};
    chipData.forEach(({ status, label }) => {
      const chip = document.createElement('button');
      chip.className   = `verify-summary-chip ${status}`;
      chip.textContent = label;
      chip.type        = 'button';
      chips[status]    = chip;
      summary.appendChild(chip);
    });

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
    const rows  = [];

    for (const item of items) {
      let statusLabel, statusClass, spreadsheetDisplay;

      if (!item.found_in_spreadsheet) {
        statusLabel        = 'Not found';
        statusClass        = 'notfound';
        spreadsheetDisplay = '—';
      } else if (isMatch(item.justification_value, item.spreadsheet_value)) {
        statusLabel        = 'Match';
        statusClass        = 'match';
        spreadsheetDisplay = formatCurrency(item.spreadsheet_value);
      } else {
        statusLabel        = 'Mismatch';
        statusClass        = 'mismatch';
        spreadsheetDisplay = formatCurrency(item.spreadsheet_value);
      }

      const tr = document.createElement('tr');
      tr.className        = `verify-row-${statusClass}`;
      tr.dataset.status   = statusClass;
      tr.innerHTML =
        `<td class="verify-cell-label">${item.label}</td>` +
        `<td class="verify-cell-value">${formatCurrency(item.justification_value)}</td>` +
        `<td class="verify-cell-value">${spreadsheetDisplay}</td>` +
        `<td><span class="verify-badge ${statusClass}">${statusLabel}</span></td>`;
      tbody.appendChild(tr);
      rows.push(tr);
    }

    function applyFilter() {
      rows.forEach(tr => {
        tr.classList.toggle('hidden', !activeFilters.has(tr.dataset.status));
      });
    }

    chipData.forEach(({ status }) => {
      chips[status].addEventListener('click', () => {
        if (activeFilters.has(status)) {
          activeFilters.delete(status);
          chips[status].classList.add('inactive');
        } else {
          activeFilters.add(status);
          chips[status].classList.remove('inactive');
        }
        applyFilter();
      });
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    const needsMarkup = items.some(i =>
      !i.found_in_spreadsheet || !isMatch(i.justification_value, i.spreadsheet_value)
    );

    if (needsMarkup) {
      const btnRow = document.createElement('div');
      btnRow.className = 'verify-download-row';

      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Download Marked Up Document';
      btn.addEventListener('click', () => Highlighter.download(justificationFile, lastExtracted, items));

      btnRow.appendChild(btn);
      container.appendChild(btnRow);
    }

    container.classList.remove('hidden');
  }

  async function handleVerify() {
    const apiKey = Settings.loadApiKey();
    if (!apiKey)            { setStatus('No API key saved. Go to the Settings tab and save your Gemini API key.', 'error'); return; }
    if (!justificationFile) { setStatus('Please upload a budget justification document.', 'error'); return; }
    if (!budgetFile)        { setStatus('Please upload a budget spreadsheet.', 'error'); return; }

    setRunning(true);
    setStatus('');
    clearStepLog();
    document.getElementById('verify-results').classList.add('hidden');

    try {
      if (justificationFile.name.toLowerCase().endsWith('.doc') && !justificationFile.name.toLowerCase().endsWith('.docx')) {
        throw new Error('Legacy .doc files cannot be parsed in the browser. Please re-save as .docx and re-upload.');
      }

      const justStep = addStep('Parsing justification document');
      const buffer = await justificationFile.arrayBuffer();
      const mammothResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      if (!mammothResult.value.trim()) throw new Error('Budget justification document appears to be empty.');
      const justificationText = mammothResult.value.trim();
      justStep.done(justificationFile.name, [
        { label: 'Extracted Text', content: justificationText }
      ]);

      const budgetStep = addStep('Parsing budget spreadsheet');
      const { csvText } = await Parser.parse(budgetFile);
      budgetStep.done(budgetFile.name, [
        { label: 'Extracted CSV', content: csvText }
      ]);

      const extractStep = addStep('Extracting values from justification');
      const extracted   = await Api.extractValues(justificationText, apiKey);
      lastExtracted     = extracted;
      extractStep.done(`${extracted.length} values found`, [
        { label: 'Extracted Values', content: JSON.stringify(extracted, null, 2) }
      ]);

      const matchStep = addStep('Matching against spreadsheet');
      const comparison = await Api.matchValues(extracted, csvText, apiKey);
      matchStep.done('done', [
        { label: 'Comparison Result', content: JSON.stringify(comparison, null, 2) }
      ]);

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

    document.getElementById('verify-log-toggle').addEventListener('click', () => {
      const log    = document.getElementById('verify-step-log');
      const toggle = document.getElementById('verify-log-toggle');
      const hidden = log.classList.toggle('hidden');
      toggle.textContent = hidden ? 'Show details' : 'Hide details';
    });
  }

  return { init };
})();
