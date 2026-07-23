const VerifierChat = (() => {
  const STORAGE_KEY = 'jit_verifier_chat_progress';

  let session             = null;
  let apiKeyRef           = null;
  let onCompleteCb        = null;
  let sending             = false;
  let previewReadyPromise = null;
  let previewView         = 'document';
  let cachedItems         = [];
  let cachedSheets        = [];
  let itemSheetMap        = new Map();
  let activeSheetName     = null;
  let cachedDocHtml       = null;

  function loadStoredSession() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function sectionsMatch(a, b) {
    if (a.length !== b.length) return false;
    return a.every((s, i) => s.section_label === b[i].section_label && s.type === b[i].type);
  }

  function joinNatural(items) {
    if (items.length <= 1) return items[0] || '';
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  }

  function formatItemList(items, limit = 5) {
    const labels = items.map(i => i.label);
    if (labels.length <= limit) return joinNatural(labels);
    return `${joinNatural(labels.slice(0, limit))}, and ${labels.length - limit} more`;
  }

  function lowerFirst(text) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  function ensureSentenceEnd(text) {
    const trimmed = text.trim();
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  }

  function buildOpenerMessage(section) {
    if (section.type === 'not_found') {
      const itemList = formatItemList(section.items);
      return `I've completed my audit of the budget and budget justification. There were a couple of items I had trouble finding in the spreadsheet, including ${itemList}. If any of these look important, it may be worth double-checking them — otherwise, no action needed.`;
    }
    const discrepancy = ensureSentenceEnd(lowerFirst(section.explanation));
    return `It appears that ${discrepancy} Do you notice the same thing when you compare the two documents, or did I misunderstand something?`;
  }

  function modalEl()      { return document.getElementById('verify-chat-modal'); }
  function threadEl()     { return document.getElementById('verify-chat-thread'); }
  function previewEl()    { return document.getElementById('verify-chat-preview'); }
  function previewBodyEl(){ return document.getElementById('verify-chat-preview-body'); }
  function sheetTabsEl()  { return document.getElementById('verify-chat-sheet-tabs'); }
  function progressEl()   { return document.getElementById('verify-chat-progress'); }
  function inputEl()      { return document.getElementById('verify-chat-input'); }
  function sendBtnEl()    { return document.getElementById('verify-chat-send'); }
  function inputRowEl()   { return document.getElementById('verify-chat-input-row'); }
  function ackRowEl()     { return document.getElementById('verify-chat-ack-row'); }
  function ackBtnEl()     { return document.getElementById('verify-chat-ack'); }

  function openModal()  { modalEl().classList.remove('hidden'); }
  function closeModal() { modalEl().classList.add('hidden'); }

  function currentSection() {
    return session ? session.sections[session.currentIndex] : null;
  }

  function renderDocumentView() {
    const body = previewBodyEl();
    DocPreview.render(body, cachedDocHtml);
    if (cachedDocHtml) DocPreview.highlightItems(body, cachedItems);
  }

  function renderSpreadsheetView() {
    const body = previewBodyEl();
    if (!cachedSheets.length) {
      body.innerHTML = '<p class="doc-preview-empty">No spreadsheet data to preview.</p>';
      return;
    }
    if (!activeSheetName) activeSheetName = cachedSheets[0].name;
    SheetPreview.render(body, cachedSheets, activeSheetName);
    SheetPreview.highlightItems(body, cachedItems);
  }

  function updatePreviewTabsUI() {
    previewEl().querySelectorAll('.preview-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === previewView);
    });

    const tabsContainer = sheetTabsEl();
    tabsContainer.classList.toggle('hidden', previewView !== 'spreadsheet' || cachedSheets.length <= 1);
    tabsContainer.innerHTML = '';
    cachedSheets.forEach(sheet => {
      const btn = document.createElement('button');
      btn.type        = 'button';
      btn.className   = `sheet-tab ${sheet.name === activeSheetName ? 'active' : ''}`;
      btn.textContent = sheet.name;
      btn.addEventListener('click', () => selectSheet(sheet.name));
      tabsContainer.appendChild(btn);
    });
  }

  function selectView(view) {
    if (view === previewView) return;
    previewView = view;
    if (view === 'document') renderDocumentView(); else renderSpreadsheetView();
    updatePreviewTabsUI();
    highlightCurrentSection();
  }

  function selectSheet(name) {
    if (name === activeSheetName) return;
    activeSheetName = name;
    updatePreviewTabsUI();
    renderSpreadsheetView();
    highlightCurrentSection();
  }

  function buildPreview(justificationFile, budgetFile, sections) {
    previewView     = 'document';
    activeSheetName = null;
    cachedDocHtml   = null;
    cachedSheets    = [];
    cachedItems     = sections.flatMap(s => s.items.map(item => ({
      label:               item.label,
      context:             item.context,
      justification_value: item.justification_value,
      spreadsheet_value:   item.spreadsheet_value,
      color:               s.type === 'not_found' ? 'yellow' : 'red',
      variants:            Highlighter.formatVariants(item.justification_value)
    })));

    updatePreviewTabsUI();
    previewBodyEl().innerHTML = '<p class="doc-preview-loading">Loading preview…</p>';

    previewReadyPromise = Promise.all([
      DocPreview.extractHtml(justificationFile).catch(() => null),
      SheetPreview.extractSheets(budgetFile).catch(() => [])
    ]).then(([html, sheets]) => {
      cachedDocHtml = html;
      cachedSheets  = sheets;
      itemSheetMap  = SheetPreview.mapItemsToSheets(sheets, cachedItems);
      renderDocumentView();
      updatePreviewTabsUI();
    });
  }

  function highlightCurrentSection() {
    const section = currentSection();
    if (!section) return;
    DocPreview.setActive(previewBodyEl(), section.items.map(i => i.label));
  }

  function applyActiveHighlight() {
    const section = currentSection();
    if (!section) return;
    const labels = section.items.map(i => i.label);

    if (previewView === 'spreadsheet') {
      const targetSheet = labels.map(l => itemSheetMap.get(l)).find(Boolean);
      if (targetSheet && targetSheet !== activeSheetName) {
        activeSheetName = targetSheet;
        renderSpreadsheetView();
        updatePreviewTabsUI();
      }
    }
    highlightCurrentSection();
  }

  async function focusCurrentSection() {
    if (!previewReadyPromise) return;
    await previewReadyPromise;
    applyActiveHighlight();
  }

  function updateProgress() {
    progressEl().textContent = `Item ${session.currentIndex + 1} of ${session.sections.length}`;
  }

  function renderThread() {
    const section = currentSection();
    const thread   = threadEl();
    thread.innerHTML = '';
    section.transcript.forEach(turn => {
      const bubble = document.createElement('div');
      bubble.className   = `chat-msg ${turn.role}`;
      bubble.textContent = turn.text;
      thread.appendChild(bubble);
    });
    thread.scrollTop = thread.scrollHeight;
  }

  function setSending(active) {
    sending = active;
    inputEl().disabled = active;
    sendBtnEl().disabled = active;
    sendBtnEl().textContent = active ? 'Thinking…' : 'Send';
  }

  function updateFooter(section) {
    const isAckOnly = section.type === 'not_found';
    inputRowEl().classList.toggle('hidden', isAckOnly);
    ackRowEl().classList.toggle('hidden', !isAckOnly);
  }

  function renderCurrentSection() {
    const section = currentSection();
    if (!section) { finishSession(); return; }
    if (section.transcript.length === 0) {
      section.transcript.push({ role: 'assistant', text: buildOpenerMessage(section) });
      persist();
    }
    updateProgress();
    updateFooter(section);
    renderThread();
    focusCurrentSection();
  }

  function advance() {
    session.currentIndex += 1;
    persist();
    renderCurrentSection();
  }

  function finishSession() {
    session.completedAt = Date.now();
    persist();
    closeModal();
    if (onCompleteCb) onCompleteCb(session.sections);
  }

  function handleAcknowledge() {
    const section = currentSection();
    section.tag = 'not_a_concern';
    section.transcript.push({ role: 'user', text: 'Got it.' });
    persist();
    renderThread();
    advance();
  }

  async function handleSend() {
    if (sending) return;
    const input = inputEl();
    const text  = input.value.trim();
    if (!text) return;
    input.value = '';

    const section = currentSection();
    section.transcript.push({ role: 'user', text });
    persist();
    renderThread();

    setSending(true);
    try {
      const result = await Api.classifyReply(section, section.transcript, session.justificationText, session.csvText, apiKeyRef);
      section.transcript.push({ role: 'assistant', text: result.assistant_reply });
      section.tag = result.tag;
      if (!result.needs_followup) section.resolution = result.resolution_summary;
      persist();
      renderThread();

      if (!result.needs_followup) advance();
    } catch (err) {
      section.transcript.push({ role: 'assistant', text: 'Sorry, something went wrong reaching the AI: ' + err.message });
      persist();
      renderThread();
    } finally {
      setSending(false);
    }
  }

  function renderResumeBanner(onComplete, docKey, justificationFile, budgetFile) {
    const stored = loadStoredSession();
    const container = document.getElementById('verify-results');
    if (!stored || stored.docKey !== docKey) return;

    const card = document.createElement('div');
    card.className = 'summary-cards';

    const inner = document.createElement('div');
    inner.className = 'summary-card clean';

    const header = document.createElement('div');
    header.className = 'summary-card-header';
    header.textContent = stored.completedAt ? 'Previous Review Available' : 'Review In Progress';

    const explanation = document.createElement('p');
    explanation.className = 'summary-card-explanation';
    explanation.textContent = stored.completedAt
      ? "You've already finished reviewing this document's findings."
      : `You have an unfinished review — item ${stored.currentIndex + 1} of ${stored.sections.length}.`;

    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'btn btn-secondary';
    btn.textContent = stored.completedAt ? 'View Summary' : 'Continue Review';
    btn.addEventListener('click', () => {
      container.innerHTML = '';
      if (stored.completedAt) {
        onComplete(stored.sections);
      } else {
        session      = stored;
        apiKeyRef    = Settings.loadApiKey();
        onCompleteCb = onComplete;
        buildPreview(justificationFile, budgetFile, session.sections);
        openModal();
        renderCurrentSection();
      }
    });

    inner.appendChild(header);
    inner.appendChild(explanation);
    inner.appendChild(btn);
    card.appendChild(inner);
    container.innerHTML = '';
    container.appendChild(card);
    container.classList.remove('hidden');
  }

  function start(opts) {
    const stored = loadStoredSession();
    if (stored && stored.docKey === opts.docKey && !stored.completedAt && sectionsMatch(stored.sections, opts.sections)) {
      session = stored;
    } else {
      session = {
        docKey: opts.docKey,
        justificationText: opts.justificationText,
        csvText: opts.csvText,
        sections: opts.sections.map(s => ({ ...s, tag: null, transcript: [] })),
        currentIndex: 0,
        completedAt: null
      };
      persist();
    }

    apiKeyRef    = opts.apiKey;
    onCompleteCb = opts.onComplete;

    buildPreview(opts.justificationFile, opts.budgetFile, session.sections);
    openModal();
    renderCurrentSection();
  }

  function tryResume(onComplete, docKey, justificationFile, budgetFile) {
    renderResumeBanner(onComplete, docKey, justificationFile, budgetFile);
  }

  function hasStoredSession() {
    return !!loadStoredSession();
  }

  function init() {
    document.getElementById('verify-chat-close').addEventListener('click', closeModal);
    previewEl().querySelectorAll('.preview-tab').forEach(btn => {
      btn.addEventListener('click', () => selectView(btn.dataset.view));
    });
    sendBtnEl().addEventListener('click', handleSend);
    inputEl().addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      handleSend();
    });
    ackBtnEl().addEventListener('click', handleAcknowledge);
  }

  return { start, tryResume, hasStoredSession, init };
})();
