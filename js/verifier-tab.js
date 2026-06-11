const VerifierTab = (() => {
  let justificationFile  = null;
  let budgetFile         = null;
  let lastExtracted      = null;
  let showSuccessOnStop  = false;

  function setStatus(msg, type = '') {
    const el       = document.getElementById('verify-status');
    el.textContent = msg;
    el.className   = 'status-message' + (type ? ' ' + type : '');
  }

  function setRunning(active) {
    document.getElementById('verify-btn').disabled = active;
    const el = document.getElementById('verify-loading');
    if (!active && showSuccessOnStop) {
      showSuccessOnStop = false;
      el.classList.add('success');
      el.querySelector('.loading-text').textContent = 'All clear!';
      setTimeout(() => { el.classList.add('hidden'); el.classList.remove('success'); }, 2500);
    } else {
      el.classList.toggle('hidden', !active);
      if (active) el.classList.remove('success');
    }
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

    if (!items.length) {
      const msg = document.createElement('p');
      msg.className   = 'verify-intro';
      msg.textContent = 'No discrepancies found — all values match the spreadsheet.';
      container.appendChild(msg);
      container.classList.remove('hidden');
      return;
    }

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
        '<th>Type</th>' +
      '</tr></thead>';

    const tbody = document.createElement('tbody');

    const cascadingMap = new Map();
    items.forEach(item => {
      if (item.cause_type === 'CASCADING' && item.root_cause_label) {
        if (!cascadingMap.has(item.root_cause_label)) cascadingMap.set(item.root_cause_label, []);
        cascadingMap.get(item.root_cause_label).push(item);
      }
    });
    const cascadingHandled = new Set();

    const renderRow = (item, indented) => {
      const isMismatch  = item.status === 'MISMATCH';
      const statusLabel = isMismatch ? 'Mismatch' : 'Not Found';
      const statusClass = isMismatch ? 'mismatch' : 'notfound';

      const tr = document.createElement('tr');
      tr.className = `verify-row-${statusClass}${indented ? ' verify-row-indented' : ''}`;

      const tdLabel = document.createElement('td');
      tdLabel.className   = 'verify-cell-label';
      tdLabel.textContent = item.label;

      const tdJust = document.createElement('td');
      tdJust.className   = 'verify-cell-value';
      tdJust.textContent = formatCurrency(item.justification_value);

      const tdSheet = document.createElement('td');
      tdSheet.className   = 'verify-cell-value';
      tdSheet.textContent = item.spreadsheet_value !== undefined ? formatCurrency(item.spreadsheet_value) : '—';

      const tdStatus = document.createElement('td');
      const badge = document.createElement('span');
      badge.className   = `verify-badge ${statusClass}`;
      badge.textContent = statusLabel;
      tdStatus.appendChild(badge);

      const tdType = document.createElement('td');
      if (item.cause_type) {
        const typeBadge = document.createElement('span');
        typeBadge.className   = `verify-badge cause-${item.cause_type === 'ROOT_CAUSE' ? 'root' : 'cascading'}`;
        typeBadge.textContent = item.cause_type === 'ROOT_CAUSE' ? 'Root Cause' : 'Cascading';
        tdType.appendChild(typeBadge);
      } else {
        tdType.textContent = '—';
      }

      tr.append(tdLabel, tdJust, tdSheet, tdStatus, tdType);
      tbody.appendChild(tr);
    };

    items.forEach(item => {
      if (item.cause_type === 'CASCADING' && item.root_cause_label) return;
      renderRow(item, false);
      const children = cascadingMap.get(item.label) || [];
      children.forEach(child => {
        cascadingHandled.add(child);
        renderRow(child, true);
      });
    });

    items.forEach(item => {
      if (item.cause_type === 'CASCADING' && item.root_cause_label && !cascadingHandled.has(item)) {
        renderRow(item, false);
      }
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    if (items.length) {
      const btnRow = document.createElement('div');
      btnRow.className = 'verify-download-row';

      const btn = document.createElement('button');
      btn.type        = 'button';
      btn.className   = 'btn btn-secondary';
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

      const scriptStep = addStep('Scanning for dollar values');
      const preExtracted = Extractor.run(justificationText);
      scriptStep.done(`${preExtracted.length} values found`, [
        { label: 'Script Extraction', content: JSON.stringify(preExtracted, null, 2) }
      ]);

      const extractStep = addStep('Labeling extracted values');
      const extracted   = await Api.extractValues(preExtracted, justificationText, apiKey);
      lastExtracted     = extracted;
      extractStep.done(`${extracted.length} values labeled`, [
        { label: 'Labeled Values', content: JSON.stringify(extracted, null, 2) }
      ]);

      const matchStep  = addStep('Matching against spreadsheet');
      const comparison = await Api.matchValues(extracted, csvText, apiKey);
      matchStep.done(`${comparison.length} values matched`, [
        { label: 'Comparison Result', content: JSON.stringify(comparison, null, 2) }
      ]);

      const problemItems = comparison.filter(c =>
        !c.found_in_spreadsheet || !isMatch(c.justification_value, c.spreadsheet_value)
      );
      const problemStep = addStep('Filtering discrepancies for audit');
      problemStep.done(`${problemItems.length} item${problemItems.length !== 1 ? 's' : ''} flagged`, [
        { label: 'Audit Input', content: JSON.stringify(problemItems, null, 2) }
      ]);

      const auditStep = addStep('Auditing discrepancies');
      const rawAuditItems = await Api.auditResults(problemItems, justificationText, csvText, apiKey);
      const auditItems    = rawAuditItems.filter(item =>
        !(item.status === 'MISMATCH' && item.spreadsheet_value !== undefined && isMatch(item.justification_value, item.spreadsheet_value))
      );
      auditStep.done(`${auditItems.length} finding${auditItems.length !== 1 ? 's' : ''}`, [
        { label: 'Audit Findings', content: JSON.stringify(auditItems, null, 2) }
      ]);

      renderResults(auditItems);
      if (!auditItems.length) showSuccessOnStop = true;
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
