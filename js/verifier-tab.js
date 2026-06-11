const VerifierTab = (() => {
  let justificationFile  = null;
  let budgetFile         = null;
  let lastExtracted      = null;
  let showSuccessOnStop  = false;

  let cachedJustificationText  = null;
  let cachedCsvText            = null;
  let cachedPreExtracted       = null;
  let cachedExtracted          = null;
  let cachedComparison          = null;
  let cachedNotFoundItems       = null;
  let cachedNotFoundAuditResult = null;
  let cachedMismatchAuditResult = null;

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
      if (active) {
        el.classList.remove('success');
        el.querySelector('.loading-text').firstChild.textContent = 'Analyzing your documents';
      }
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
      done(summary, sections, onRerun) {
        item.className   = 'step-item done';
        icon.className   = 'step-icon';
        icon.textContent = '✓';
        if (summary) text.textContent = label + ' — ' + summary;
        if (sections && sections.length) attachDetails(sections);
        if (onRerun) {
          const rerunBtn = document.createElement('button');
          rerunBtn.className   = 'step-rerun-btn';
          rerunBtn.textContent = '↻ Rerun from here';
          rerunBtn.addEventListener('click', () => {
            let sibling = item.nextElementSibling;
            while (sibling) {
              const next = sibling.nextElementSibling;
              sibling.remove();
              sibling = next;
            }
            item.remove();
            onRerun();
          });
          row.appendChild(rerunBtn);
        }
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

  function renderSummary(sections) {
    const container = document.getElementById('verify-results');
    container.innerHTML = '';

    if (!sections.length) {
      showSuccessOnStop = true;
      const msg = document.createElement('p');
      msg.className   = 'verify-intro';
      msg.textContent = 'No issues found — all values match the spreadsheet.';
      container.appendChild(msg);
      container.classList.remove('hidden');
      return;
    }

    const cards = document.createElement('div');
    cards.className = 'summary-cards';

    sections.forEach(section => {
      const card = document.createElement('div');
      card.className = `summary-card ${section.type === 'not_found' ? 'not-found' : 'mismatch'}`;

      const header = document.createElement('div');
      header.className   = 'summary-card-header';
      header.textContent = section.section_label;

      const explanation = document.createElement('p');
      explanation.className   = 'summary-card-explanation';
      explanation.textContent = section.explanation;

      const itemList = document.createElement('ul');
      itemList.className = 'summary-card-items';
      section.items.forEach(item => {
        const li   = document.createElement('li');
        li.className = 'summary-card-item';
        const name = document.createElement('span');
        name.textContent = item.label;
        li.appendChild(name);
        if (item.spreadsheet_value !== undefined) {
          const diff = document.createElement('span');
          diff.className   = 'summary-card-item-diff';
          diff.textContent = ` — ${formatCurrency(item.justification_value)} vs ${formatCurrency(item.spreadsheet_value)}`;
          li.appendChild(diff);
        }
        itemList.appendChild(li);
      });

      card.appendChild(header);
      card.appendChild(explanation);
      card.appendChild(itemList);
      cards.appendChild(card);
    });

    container.appendChild(cards);

    const allItems      = sections.flatMap(s => s.items.map(item => ({ ...item, status: s.type === 'not_found' ? 'NOT_FOUND' : 'MISMATCH' })));
    const fakeExtracted = allItems.map(item => ({ label: item.label, context: item.context || '' }));

    const btnRow = document.createElement('div');
    btnRow.className = 'verify-download-row';
    const btn = document.createElement('button');
    btn.type        = 'button';
    btn.className   = 'btn btn-secondary';
    btn.textContent = 'Download Marked Up Document';
    btn.addEventListener('click', () => Highlighter.download(justificationFile, fakeExtracted, allItems));
    btnRow.appendChild(btn);
    container.appendChild(btnRow);

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

    const loadingTextNode = document.querySelector('#verify-loading .loading-text').firstChild;
    Api.setRetryHandler(msg => {
      loadingTextNode.textContent = msg || 'Analyzing your documents';
    });

    try {
      if (justificationFile.name.toLowerCase().endsWith('.doc') && !justificationFile.name.toLowerCase().endsWith('.docx')) {
        throw new Error('Legacy .doc files cannot be parsed in the browser. Please re-save as .docx and re-upload.');
      }

      const justStep = addStep('Parsing justification document');
      const buffer = await justificationFile.arrayBuffer();
      const mammothResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      if (!mammothResult.value.trim()) throw new Error('Budget justification document appears to be empty.');
      const justificationText = mammothResult.value.trim();
      cachedJustificationText = justificationText;
      justStep.done(justificationFile.name, [
        { label: 'Extracted Text', content: justificationText }
      ]);

      const budgetStep = addStep('Parsing budget spreadsheet');
      const { csvText } = await Parser.parse(budgetFile);
      cachedCsvText = csvText;
      budgetStep.done(budgetFile.name, [
        { label: 'Extracted CSV', content: csvText }
      ]);

      const scriptStep = addStep('Scanning for dollar values');
      const preExtracted = Extractor.run(justificationText);
      cachedPreExtracted = preExtracted;
      scriptStep.done(`${preExtracted.length} values found`, [
        { label: 'Script Extraction', content: JSON.stringify(preExtracted, null, 2) }
      ]);

      await runApiStepsFrom('extract', apiKey);
    } catch (err) {
      setStatus('Error: ' + err.message, 'error');
    } finally {
      Api.setRetryHandler(null);
      setRunning(false);
    }
  }

  async function runApiStepsFrom(startStep, apiKey) {
    let extracted = cachedExtracted;

    if (startStep === 'extract') {
      const extractStep = addStep('Labeling extracted values');
      extracted         = await Api.extractValues(cachedPreExtracted, cachedJustificationText, apiKey);
      lastExtracted     = extracted;
      cachedExtracted   = extracted;
      extractStep.done(`${extracted.length} values labeled`, [
        { label: 'Labeled Values', content: JSON.stringify(extracted, null, 2) }
      ], () => rerunFrom('extract'));
    }

    if (startStep === 'extract' || startStep === 'match') {
      const matchStep  = addStep('Matching against spreadsheet');
      const comparison = await Api.matchValues(extracted, cachedCsvText, apiKey);
      cachedComparison = comparison;
      matchStep.done(`${comparison.length} values matched`, [
        { label: 'Comparison Result', content: JSON.stringify(comparison, null, 2) }
      ], () => rerunFrom('match'));

      const problemItems = comparison
        .filter(c => !c.found_in_spreadsheet || !isMatch(c.justification_value, c.spreadsheet_value))
        .map(c => {
          const src = extracted.find(e => e.label === c.label);
          return src?.context ? { ...c, context: src.context } : c;
        });
      const problemStep = addStep('Filtering discrepancies for audit');
      problemStep.done(`${problemItems.length} item${problemItems.length !== 1 ? 's' : ''} flagged`, [
        { label: 'Audit Input', content: JSON.stringify(problemItems, null, 2) }
      ]);

      cachedNotFoundItems = problemItems.filter(c => !c.found_in_spreadsheet);
    }

    if (startStep !== 'mismatchAudit' && startStep !== 'summary') {
      const notFoundAuditStep   = addStep('Auditing not-found values');
      const notFoundAuditResult = await Api.auditNotFound(cachedNotFoundItems, cachedJustificationText, cachedCsvText, apiKey);
      cachedNotFoundAuditResult = notFoundAuditResult;
      notFoundAuditStep.done(`${notFoundAuditResult.length} item${notFoundAuditResult.length !== 1 ? 's' : ''} resolved`, [
        { label: 'NOT_FOUND Audit', content: JSON.stringify(notFoundAuditResult, null, 2) }
      ], () => rerunFrom('notFoundAudit'));
    }

    if (startStep !== 'summary') {
      const mismatchItems = [
        ...(cachedComparison || [])
          .filter(c => c.found_in_spreadsheet && !isMatch(c.justification_value, c.spreadsheet_value))
          .map(c => {
            const src = (cachedExtracted || []).find(e => e.label === c.label);
            return { label: c.label, justification_value: c.justification_value, spreadsheet_value: c.spreadsheet_value, context: src?.context || '' };
          }),
        ...(cachedNotFoundAuditResult || [])
          .filter(c => c.found_in_spreadsheet && !isMatch(c.justification_value, c.spreadsheet_value))
          .map(c => ({ label: c.label, justification_value: c.justification_value, spreadsheet_value: c.spreadsheet_value, context: c.context || '' }))
      ];

      const mismatchAuditStep = addStep('Auditing mismatches');
      if (!mismatchItems.length) {
        cachedMismatchAuditResult = [];
        mismatchAuditStep.done('no mismatches to audit', [
          { label: 'Mismatch Audit', content: '[]' }
        ]);
      } else {
        const mismatchAuditResult = await Api.auditMismatches(mismatchItems, cachedJustificationText, cachedCsvText, apiKey);
        cachedMismatchAuditResult = mismatchAuditResult;
        mismatchAuditStep.done(`${mismatchAuditResult.length} group${mismatchAuditResult.length !== 1 ? 's' : ''} identified`, [
          { label: 'Mismatch Audit', content: JSON.stringify(mismatchAuditResult, null, 2) }
        ], () => rerunFrom('mismatchAudit'));
      }
    }

    const trulyNotFound = (cachedNotFoundAuditResult || [])
      .filter(c => !c.found_in_spreadsheet && !c.calculated_in_spreadsheet);

    const summaryStep  = addStep('Generating summary');
    const summaryResult = await Api.auditSummary(trulyNotFound, cachedMismatchAuditResult || [], cachedJustificationText, cachedCsvText, apiKey);
    summaryStep.done(`${summaryResult.length} section${summaryResult.length !== 1 ? 's' : ''}`, [
      { label: 'Summary', content: JSON.stringify(summaryResult, null, 2) }
    ], () => rerunFrom('summary'));

    renderSummary(summaryResult);
  }

  async function rerunFrom(startStep) {
    const apiKey = Settings.loadApiKey();
    if (!apiKey) { setStatus('No API key saved. Go to the Settings tab and save your Gemini API key.', 'error'); return; }

    setRunning(true);
    setStatus('');
    document.getElementById('verify-results').classList.add('hidden');

    const loadingTextNode = document.querySelector('#verify-loading .loading-text').firstChild;
    Api.setRetryHandler(msg => {
      loadingTextNode.textContent = msg || 'Analyzing your documents';
    });

    try {
      await runApiStepsFrom(startStep, apiKey);
    } catch (err) {
      setStatus('Error: ' + err.message, 'error');
    } finally {
      Api.setRetryHandler(null);
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

  async function handleDebugSend() {
    const apiKey = Settings.loadApiKey();
    if (!apiKey) {
      document.getElementById('debug-status').textContent = 'No API key saved. Go to the Settings tab.';
      document.getElementById('debug-status').className = 'status-message error';
      return;
    }
    const prompt = document.getElementById('debug-prompt-input').value.trim();
    if (!prompt) {
      document.getElementById('debug-status').textContent = 'Enter a prompt first.';
      document.getElementById('debug-status').className = 'status-message error';
      return;
    }

    const btn = document.getElementById('debug-send-btn');
    const statusEl = document.getElementById('debug-status');
    const responseEl = document.getElementById('debug-response');
    const responseText = document.getElementById('debug-response-text');

    btn.disabled = true;
    statusEl.textContent = 'Sending...';
    statusEl.className = 'status-message';
    responseEl.classList.add('hidden');

    try {
      const result = await Api.sendRaw(apiKey, prompt);
      responseText.textContent = result;
      responseEl.classList.remove('hidden');
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'status-message error';
    } finally {
      btn.disabled = false;
    }
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
    document.getElementById('debug-send-btn').addEventListener('click', handleDebugSend);

    document.getElementById('verify-log-toggle').addEventListener('click', () => {
      const log    = document.getElementById('verify-step-log');
      const toggle = document.getElementById('verify-log-toggle');
      const hidden = log.classList.toggle('hidden');
      toggle.textContent = hidden ? 'Show details' : 'Hide details';
    });
  }

  return { init };
})();
