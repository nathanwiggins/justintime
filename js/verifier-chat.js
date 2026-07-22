const VerifierChat = (() => {
  const STORAGE_KEY = 'jit_verifier_chat_progress';

  let session      = null;
  let apiKeyRef     = null;
  let onCompleteCb  = null;
  let sending       = false;

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

  function renderResumeBanner(onComplete, docKey) {
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

    openModal();
    renderCurrentSection();
  }

  function tryResume(onComplete, docKey) {
    renderResumeBanner(onComplete, docKey);
  }

  function hasStoredSession() {
    return !!loadStoredSession();
  }

  function init() {
    document.getElementById('verify-chat-close').addEventListener('click', closeModal);
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
