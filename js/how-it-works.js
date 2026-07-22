const HowItWorks = (() => {
  const EXAMPLE = {
    salaryLabel: 'Dr. Ortiz Year 1 Salary',
    salaryValue: 62400,
    salaryContext: '...Dr. Ortiz will lead the microscopy work at a salary of $62,400 in Year 1...',
    fringeLabel: 'Fringe Benefits Year 1',
    fringeValue: 18720,
    fringeSpreadsheetValue: 19500,
    mismatchGroupLabel: 'Outdated fringe benefit rate'
  };

  const ICONS = {
    document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h6M9.5 16.5h6M9.5 9.5h3"/></svg>',
    spreadsheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 9.5h17M3.5 15h17M9.5 4v16M15 4v16"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L19 9.5l-5.2 1.9L12 17l-1.8-5.6L5 9.5l5.2-1.9z"/><path d="M19 15l.8 2.4L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.6z"/></svg>',
    magnifier: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5A1.5 1.5 0 014.5 5H9l2 2.5h8.5A1.5 1.5 0 0121 9v9.5A1.5 1.5 0 0119.5 20h-15A1.5 1.5 0 013 18.5z"/></svg>'
  };

  const ARROW = '<svg viewBox="0 0 28 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h22M18 3l6 5-6 5"/></svg>';

  function row(...children) {
    const el = document.createElement('div');
    el.className = 'step-flow-row';
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function iconBox(svg, label, delay) {
    const box = document.createElement('div');
    box.className = 'step-flow-icon-box step-flow-anim';
    box.style.animationDelay = `${delay}ms`;
    box.innerHTML = svg;
    const cap = document.createElement('div');
    cap.className = 'step-flow-icon-label';
    cap.textContent = label;
    box.appendChild(cap);
    return box;
  }

  function arrowEl(delay) {
    const el = document.createElement('div');
    el.className = 'step-flow-arrow step-flow-anim';
    el.style.animationDelay = `${delay}ms`;
    el.innerHTML = ARROW;
    return el;
  }

  function chip(text, extraClass, delay) {
    const el = document.createElement('span');
    el.className = `step-flow-chip step-flow-anim ${extraClass || ''}`.trim();
    el.style.animationDelay = `${delay}ms`;
    el.textContent = text;
    return el;
  }

  function snippet(obj, delay) {
    const pre = document.createElement('pre');
    pre.className = 'step-flow-snippet step-flow-anim';
    pre.style.animationDelay = `${delay}ms`;
    pre.textContent = JSON.stringify(obj, null, 2);
    return pre;
  }

  function heading(text) {
    const el = document.createElement('div');
    el.className = 'step-flow-title';
    el.textContent = text;
    return el;
  }

  function caption(text) {
    const el = document.createElement('p');
    el.className = 'step-flow-caption';
    el.textContent = text;
    return el;
  }

  function renderStep1(stage) {
    stage.appendChild(heading('1. Upload & Extraction'));
    stage.appendChild(row(
      iconBox(ICONS.document, 'Justification', 0),
      arrowEl(100),
      iconBox(ICONS.spreadsheet, 'Budget Sheet', 200),
      arrowEl(300),
      iconBox(ICONS.magnifier, 'Scan for $', 400)
    ));

    const line = document.createElement('p');
    line.className = 'step-flow-doc-line step-flow-anim';
    line.style.animationDelay = '550ms';
    line.append('"...a salary of ');
    line.appendChild(chip(`$${EXAMPLE.salaryValue.toLocaleString()}`, 'highlight', 700));
    line.append(' in Year 1..."');
    stage.appendChild(line);

    stage.appendChild(caption('Before any AI is involved, Just-In-Time reads your documents locally in the browser and scans the justification text for every dollar amount — nothing is sent anywhere yet.'));
  }

  function renderStep2(stage) {
    stage.appendChild(heading('2. Labeling'));
    stage.appendChild(row(
      chip(`$${EXAMPLE.salaryValue.toLocaleString()}`, '', 0),
      arrowEl(150),
      iconBox(ICONS.sparkle, 'AI labels it', 300)
    ));
    stage.appendChild(snippet({
      label: EXAMPLE.salaryLabel,
      value: EXAMPLE.salaryValue,
      context: EXAMPLE.salaryContext
    }, 500));
    stage.appendChild(caption('Rather than letting the AI reply in free-form text, we hand it a strict template — a JSON schema — and it must fill in exactly those fields, in exactly that shape. This is called "structured output," and it\'s what lets our code trust and use the AI\'s answer automatically instead of trying to parse a paragraph.'));
  }

  function renderStep3(stage) {
    stage.appendChild(heading('3. Matching'));
    stage.appendChild(row(
      iconBox(ICONS.spreadsheet, 'Spreadsheet row', 0),
      arrowEl(150),
      iconBox(ICONS.sparkle, 'AI compares', 300),
      arrowEl(450),
      iconBox(ICONS.magnifier, 'Found a gap', 600)
    ));
    stage.appendChild(snippet({
      label: EXAMPLE.fringeLabel,
      justification_value: EXAMPLE.fringeValue,
      spreadsheet_value: EXAMPLE.fringeSpreadsheetValue
    }, 800));
    stage.appendChild(chip("✗ Values don't match", 'mismatch', 950));
    stage.appendChild(caption('Each labeled value is checked against the budget spreadsheet — again through structured output, so every comparison comes back as clean data: matched, mismatched, or nowhere to be found.'));
  }

  function renderStep4(stage) {
    stage.appendChild(heading('4. Auditing'));
    stage.appendChild(row(
      chip(EXAMPLE.fringeLabel, 'mismatch', 0),
      arrowEl(150),
      iconBox(ICONS.folder, EXAMPLE.mismatchGroupLabel, 300)
    ));
    stage.appendChild(caption('A dedicated audit pass re-checks anything that seemed off, then groups related mismatches by their root cause — so instead of a long list of scattered numbers, you see "one wrong fringe rate" explaining every value it touched. Just-In-Time keeps this to about four groups at most, however many mismatches there are.'));
  }

  function renderStep5(stage) {
    stage.appendChild(heading('5. Human-in-the-Loop & Results'));

    const thread = document.createElement('div');
    thread.className = 'chat-thread';
    const msgs = [
      { role: 'assistant', text: "It looks like the fringe benefit amount doesn't match — the justification uses a 30% rate ($18,720), but the spreadsheet shows $19,500. Do you notice the same thing?" },
      { role: 'user', text: 'Ah, the fringe rate changed to 31.25% this year — I need to update the justification.' },
      { role: 'assistant', text: "Got it — I'll flag this as a real mismatch to fix." }
    ];
    msgs.forEach((m, i) => {
      const bubble = document.createElement('div');
      bubble.className = `chat-msg ${m.role} step-flow-anim`;
      bubble.style.animationDelay = `${i * 250}ms`;
      bubble.textContent = m.text;
      thread.appendChild(bubble);
    });
    stage.appendChild(thread);

    const card = document.createElement('div');
    card.className = 'summary-card mismatch step-flow-anim';
    card.style.animationDelay = '850ms';
    const header = document.createElement('div');
    header.className = 'summary-card-header';
    header.textContent = EXAMPLE.mismatchGroupLabel;
    const explanation = document.createElement('p');
    explanation.className = 'summary-card-explanation';
    explanation.textContent = 'The fringe benefit rate used in the justification is out of date, producing a $780 shortfall on this line.';
    card.appendChild(header);
    card.appendChild(explanation);
    stage.appendChild(card);

    stage.appendChild(caption("Nothing is marked as a real problem until you agree. The assistant walks through each finding conversationally, checking your explanation against the actual documents — and only then produces the final, color-coded summary you review before submitting."));
  }

  const STEPS = [
    { render: renderStep1 },
    { render: renderStep2 },
    { render: renderStep3 },
    { render: renderStep4 },
    { render: renderStep5 }
  ];

  let flow = null;

  function modalEl() { return document.getElementById('how-it-works-modal'); }
  function flowEl()  { return document.getElementById('how-it-works-flow'); }

  function openModal() {
    modalEl().classList.remove('hidden');
    flow = StepFlow.create({
      container: flowEl(),
      steps: STEPS,
      onFinish: closeModal
    });
  }

  function closeModal() {
    modalEl().classList.add('hidden');
    if (flow) { flow.destroy(); flow = null; }
  }

  function init() {
    document.getElementById('how-it-works-btn').addEventListener('click', openModal);
    document.getElementById('how-it-works-close').addEventListener('click', closeModal);
    modalEl().querySelector('.modal-overlay').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modalEl().classList.contains('hidden')) closeModal();
    });
  }

  return { init };
})();
