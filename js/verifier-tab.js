const VerifierTab = (() => {
  let justificationFile  = null;
  let budgetFile         = null;
  let lastExtracted      = null;
  let showSuccessOnStop  = false;

  const BATCH_SIZE = 25;

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

    const timer = document.createElement('span');
    timer.className   = 'step-timer';
    timer.textContent = '0s';

    row.appendChild(icon);
    row.appendChild(text);
    row.appendChild(timer);
    item.appendChild(row);
    log.appendChild(item);

    const startTime = Date.now();
    const interval  = setInterval(() => {
      timer.textContent = Math.floor((Date.now() - startTime) / 1000) + 's';
    }, 1000);

    function stopTimer() {
      clearInterval(interval);
      timer.textContent = Math.floor((Date.now() - startTime) / 1000) + 's';
    }

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
        stopTimer();
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
        stopTimer();
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
      const cards = document.createElement('div');
      cards.className = 'summary-cards';
      const card = document.createElement('div');
      card.className = 'summary-card clean';
      const header = document.createElement('div');
      header.className   = 'summary-card-header';
      header.textContent = 'Documents Match';
      const explanation = document.createElement('p');
      explanation.className   = 'summary-card-explanation';
      explanation.textContent = 'The budget justification is aligned with the budget spreadsheet. No edits are needed.';
      card.appendChild(header);
      card.appendChild(explanation);
      cards.appendChild(card);
      container.appendChild(cards);
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
    if (!apiKey && !Api.isVandalizerHosted()) { setStatus('No API key saved. Go to the Settings tab and save your Gemini API key.', 'error'); return; }
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
      const justName = justificationFile.name.toLowerCase();
      if (justName.endsWith('.doc') && !justName.endsWith('.docx')) {
        throw new Error('Legacy .doc files cannot be parsed in the browser. Please re-save as .docx and re-upload.');
      }

      const justStep = addStep('Parsing justification document');
      const buffer = await justificationFile.arrayBuffer();
      let justificationText;
      if (justName.endsWith('.pdf')) {
        justificationText = await extractPdfText(buffer);
        if (!justificationText.trim()) throw new Error('Budget justification PDF appears to be empty or is a scanned image. Please use a text-based PDF or a .docx file.');
        justificationText = justificationText.trim();
      } else {
        const mammothResult = await mammoth.extractRawText({ arrayBuffer: buffer });
        if (!mammothResult.value.trim()) throw new Error('Budget justification document appears to be empty.');
        justificationText = mammothResult.value.trim();
      }
      cachedJustificationText = justificationText;
      justStep.done(justificationFile.name, [
        { label: 'Extracted Text', content: justificationText }
      ]);

      const budgetStep = addStep('Parsing budget spreadsheet');
      const { csvText } = await Parser.parse(budgetFile);
      cachedCsvText = csvText.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, (_, n) => n.replace(/,/g, ''));
      budgetStep.done(budgetFile.name, [
        { label: 'Extracted CSV', content: cachedCsvText }
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
      if (Api.isVandalizerHosted()) {
        const batches = [];
        for (let i = 0; i < cachedPreExtracted.length; i += BATCH_SIZE) {
          batches.push(cachedPreExtracted.slice(i, i + BATCH_SIZE));
        }
        const allLabeled = [];
        for (let b = 0; b < batches.length; b++) {
          const stepLabel = batches.length > 1 ? `Labeling values — batch ${b + 1} of ${batches.length}` : 'Labeling extracted values';
          const batchStep = addStep(stepLabel);
          const batchResult = await Api.extractValuesBatch(batches[b], cachedJustificationText, apiKey);
          allLabeled.push(...batchResult);
          batchStep.done(`${batchResult.length} values labeled`, [
            { label: batches.length > 1 ? `Batch ${b + 1} Labeled Values` : 'Labeled Values', content: JSON.stringify(batchResult, null, 2) }
          ], b === 0 ? () => rerunFrom('extract') : null);
        }
        extracted = allLabeled;
      } else {
        const extractStep = addStep('Labeling extracted values');
        extracted         = await Api.extractValues(cachedPreExtracted, cachedJustificationText, apiKey);
        extractStep.done(`${extracted.length} values labeled`, [
          { label: 'Labeled Values', content: JSON.stringify(extracted, null, 2) }
        ], () => rerunFrom('extract'));
      }
      lastExtracted   = extracted;
      cachedExtracted = extracted;
    }

    if (startStep === 'extract' || startStep === 'match') {
      if (Api.isVandalizerHosted()) {
        const batches = [];
        for (let i = 0; i < extracted.length; i += BATCH_SIZE) {
          batches.push(extracted.slice(i, i + BATCH_SIZE));
        }
        const allMatched = [];
        for (let b = 0; b < batches.length; b++) {
          const stepLabel = batches.length > 1 ? `Matching against spreadsheet — batch ${b + 1} of ${batches.length}` : 'Matching against spreadsheet';
          const batchStep = addStep(stepLabel);
          const batchResult = await Api.matchValuesBatch(batches[b], cachedCsvText, apiKey);
          allMatched.push(...batchResult);
          batchStep.done(`${batchResult.length} values matched`, [
            { label: batches.length > 1 ? `Batch ${b + 1} Comparison Result` : 'Comparison Result', content: JSON.stringify(batchResult, null, 2) }
          ], b === 0 ? () => rerunFrom('match') : null);
        }
        cachedComparison = allMatched;
      } else {
        const matchStep  = addStep('Matching against spreadsheet');
        const comparison = await Api.matchValues(extracted, cachedCsvText, apiKey);
        cachedComparison = comparison;
        matchStep.done(`${comparison.length} values matched`, [
          { label: 'Comparison Result', content: JSON.stringify(comparison, null, 2) }
        ], () => rerunFrom('match'));
      }

      const problemItems = cachedComparison
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

    const trulyNotFound  = (cachedNotFoundAuditResult || [])
      .filter(c => !c.found_in_spreadsheet && !c.calculated_in_spreadsheet);
    const mismatchGroups = cachedMismatchAuditResult || [];

    if (!trulyNotFound.length && !mismatchGroups.length) {
      const summaryStep = addStep('Generating summary');
      summaryStep.done('all values accounted for');
      renderSummary([]);
      return;
    }

    const summaryStep  = addStep('Generating summary');
    const summaryResult = await Api.auditSummary(trulyNotFound, mismatchGroups, cachedJustificationText, cachedCsvText, apiKey);
    summaryStep.done(`${summaryResult.length} section${summaryResult.length !== 1 ? 's' : ''}`, [
      { label: 'Summary', content: JSON.stringify(summaryResult, null, 2) }
    ], () => rerunFrom('summary'));

    const contextLookup = new Map();
    (cachedExtracted || []).forEach(e => { if (e.context) contextLookup.set(e.label, e.context); });
    (cachedNotFoundAuditResult || []).forEach(e => { if (e.context) contextLookup.set(e.label, e.context); });
    mismatchGroups.flatMap(g => g.items || []).forEach(e => { if (e.context) contextLookup.set(e.label, e.context); });

    const patchedSummary = summaryResult.map(section => ({
      ...section,
      items: section.items.map(item => ({ ...item, context: item.context || contextLookup.get(item.label) || '' }))
    }));

    renderSummary(patchedSummary);
  }

  async function rerunFrom(startStep) {
    const apiKey = Settings.loadApiKey();
    if (!apiKey && !Api.isVandalizerHosted()) { setStatus('No API key saved. Go to the Settings tab and save your Gemini API key.', 'error'); return; }

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
