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

  function buildOpenerMessage(section) {
    const question = section.type === 'not_found'
      ? "Is this something we need to track down, or is there a reason it's fine as-is?"
      : "Is this something we need to fix in the justification, or is there a reason it's fine as-is?";
    return `${section.explanation}\n\n${question}`;
  }

  function modalEl()    { return document.getElementById('verify-chat-modal'); }
  function threadEl()   { return document.getElementById('verify-chat-thread'); }
  function progressEl() { return document.getElementById('verify-chat-progress'); }
  function inputEl()    { return document.getElementById('verify-chat-input'); }
  function sendBtnEl()  { return document.getElementById('verify-chat-send'); }
  function quickBtns()  { return document.querySelectorAll('#verify-chat-quick-actions .chat-quick-btn'); }

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
    quickBtns().forEach(btn => { btn.disabled = active; });
  }

  function renderCurrentSection() {
    const section = currentSection();
    if (!section) { finishSession(); return; }
    if (section.transcript.length === 0) {
      section.transcript.push({ role: 'assistant', text: buildOpenerMessage(section) });
      persist();
    }
    updateProgress();
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

  function handleQuickTag(tag) {
    if (sending) return;
    const section = currentSection();
    section.tag = tag;
    section.transcript.push({ role: 'user', text: tag === 'real_issue' ? 'This is a real problem.' : "This isn't a concern." });
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
      const result = await Api.classifyReply(section, section.transcript, apiKeyRef);
      section.transcript.push({ role: 'assistant', text: result.assistant_reply });
      section.tag = result.tag;
      persist();
      renderThread();

      const userTurns    = section.transcript.filter(t => t.role === 'user').length;
      const shouldAdvance = !result.needs_followup || userTurns >= 2;
      if (shouldAdvance) advance();
    } catch (err) {
      section.transcript.push({ role: 'assistant', text: 'Sorry, something went wrong reaching the AI: ' + err.message });
      persist();
      renderThread();
    } finally {
      setSending(false);
    }
  }

  function renderResumeBanner(onComplete) {
    const stored = loadStoredSession();
    const container = document.getElementById('verify-results');
    if (!stored) return;

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

  function tryResume(onComplete) {
    renderResumeBanner(onComplete);
  }

  function init() {
    document.getElementById('verify-chat-close').addEventListener('click', closeModal);
    document.getElementById('verify-chat-send').addEventListener('click', handleSend);
    document.getElementById('verify-chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSend();
    });
    quickBtns().forEach(btn => {
      btn.addEventListener('click', () => handleQuickTag(btn.dataset.tag));
    });
  }

  return { start, tryResume, init };
})();
