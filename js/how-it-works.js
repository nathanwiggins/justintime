const HowItWorks = (() => {
  const VERIFIER_EXAMPLE = {
    salaryLabel: 'Dr. Ortiz Year 1 Salary',
    salaryValue: 62400,
    salaryContext: '...Dr. Ortiz will lead the microscopy work at a salary of $62,400 in Year 1...',
    fringeLabel: 'Fringe Benefits Year 1',
    fringeValue: 18720,
    fringeSpreadsheetValue: 19500,
    mismatchGroupLabel: 'Outdated fringe benefit rate'
  };

  const GENERATOR_EXAMPLE = {
    totalBudget: 250000,
    personnelLabel: 'Dr. Ortiz, PI',
    personnelSalary: 62400,
    linkedCell: 'Year 1 | B4',
    calculatedLabel: 'Total Costs'
  };

  const INTROS = {
    generator: 'Just-In-Time\'s Generator builds a first-draft budget justification straight from your budget spreadsheet and project summary — every figure traceable back to a spreadsheet cell or a clear formula. Here\'s what happens, step by step, when you click "Generate Justification."',
    verify: 'Just-In-Time\'s Verifier checks a budget justification against its budget spreadsheet before you submit it — catching typos, stale rates, and unexplained gaps automatically. Here\'s what happens, step by step, when you click "Verify Budget."'
  };

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
    el.innerHTML = Icons.arrow;
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

  function tryItButton(delay, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary step-flow-try-it-btn step-flow-anim';
    btn.style.animationDelay = `${delay}ms`;
    btn.textContent = 'Try it out!';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      closeModal();
      onClick();
    });
    return btn;
  }

  function renderVerifyStep1(stage) {
    stage.appendChild(heading('1. Upload & Extraction'));
    stage.appendChild(row(
      iconBox(Icons.document, 'Justification', 0),
      arrowEl(100),
      iconBox(Icons.spreadsheet, 'Budget Sheet', 200),
      arrowEl(300),
      iconBox(Icons.magnifier, 'Scan for $', 400)
    ));

    const line = document.createElement('p');
    line.className = 'step-flow-doc-line step-flow-anim';
    line.style.animationDelay = '550ms';
    line.append('"...a salary of ');
    line.appendChild(chip(`$${VERIFIER_EXAMPLE.salaryValue.toLocaleString()}`, 'highlight', 700));
    line.append(' in Year 1..."');
    stage.appendChild(line);

    stage.appendChild(caption('Before any AI is involved, Just-In-Time reads your documents locally in the browser and scans the justification text for every dollar amount — nothing is sent anywhere yet.'));
  }

  function renderVerifyStep2(stage) {
    stage.appendChild(heading('2. Labeling'));
    stage.appendChild(row(
      chip(`$${VERIFIER_EXAMPLE.salaryValue.toLocaleString()}`, '', 0),
      arrowEl(150),
      iconBox(Icons.sparkle, 'AI labels it', 300)
    ));
    stage.appendChild(snippet({
      label: VERIFIER_EXAMPLE.salaryLabel,
      value: VERIFIER_EXAMPLE.salaryValue,
      context: VERIFIER_EXAMPLE.salaryContext
    }, 500));
    stage.appendChild(caption('Rather than letting the AI reply in free-form text, we hand it a strict template — a JSON schema — and it must fill in exactly those fields, in exactly that shape. This is called "structured output," and it\'s what lets our code trust and use the AI\'s answer automatically instead of trying to parse a paragraph.'));
  }

  function renderVerifyStep3(stage) {
    stage.appendChild(heading('3. Matching'));
    stage.appendChild(row(
      iconBox(Icons.spreadsheet, 'Spreadsheet row', 0),
      arrowEl(150),
      iconBox(Icons.sparkle, 'AI compares', 300),
      arrowEl(450),
      iconBox(Icons.magnifier, 'Found a gap', 600)
    ));
    stage.appendChild(snippet({
      label: VERIFIER_EXAMPLE.fringeLabel,
      justification_value: VERIFIER_EXAMPLE.fringeValue,
      spreadsheet_value: VERIFIER_EXAMPLE.fringeSpreadsheetValue
    }, 800));
    stage.appendChild(chip("✗ Values don't match", 'mismatch', 950));
    stage.appendChild(caption('Each labeled value is checked against the budget spreadsheet — again through structured output, so every comparison comes back as clean data: matched, mismatched, or nowhere to be found.'));
  }

  function renderVerifyStep4(stage) {
    stage.appendChild(heading('4. Auditing'));
    stage.appendChild(row(
      chip(VERIFIER_EXAMPLE.fringeLabel, 'mismatch', 0),
      arrowEl(150),
      iconBox(Icons.folder, VERIFIER_EXAMPLE.mismatchGroupLabel, 300)
    ));
    stage.appendChild(caption('A dedicated audit pass re-checks anything that seemed off, then groups related mismatches by their root cause — so instead of a long list of scattered numbers, you see "one wrong fringe rate" explaining every value it touched. Just-In-Time keeps this to about four groups at most, however many mismatches there are.'));
  }

  function renderVerifyStep5(stage) {
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
    header.textContent = VERIFIER_EXAMPLE.mismatchGroupLabel;
    const explanation = document.createElement('p');
    explanation.className = 'summary-card-explanation';
    explanation.textContent = 'The fringe benefit rate used in the justification is out of date, producing a $780 shortfall on this line.';
    card.appendChild(header);
    card.appendChild(explanation);
    stage.appendChild(card);

    stage.appendChild(caption("Nothing is marked as a real problem until you agree. The assistant walks through each finding conversationally, checking your explanation against the actual documents — and only then produces the final, color-coded summary you review before submitting."));
  }

  function renderVerifyStep6(stage) {
    stage.appendChild(heading('Try it out!'));
    stage.appendChild(caption('See it for yourself with two sample documents — download them, upload them, and watch Just-In-Time catch a real mismatch.'));
    stage.appendChild(tryItButton(200, () => TryItTutorial.start()));
  }

  function renderGenStep1(stage) {
    stage.appendChild(heading('1. Upload & Check Figure'));
    stage.appendChild(row(
      iconBox(Icons.document, 'Project Summary', 0),
      arrowEl(100),
      iconBox(Icons.spreadsheet, 'Budget Sheet', 200),
      arrowEl(300),
      iconBox(Icons.sparkle, 'AI reads Total Budget', 400)
    ));
    stage.appendChild(row(
      chip(`$${GENERATOR_EXAMPLE.totalBudget.toLocaleString()}`, 'match', 600),
      chip(`$${GENERATOR_EXAMPLE.totalBudget.toLocaleString()}`, 'match', 750)
    ));
    stage.appendChild(caption("Before anything else, Just-In-Time asks AI to read your spreadsheet's overall Total Budget twice, independently. The two readings have to agree — retried up to 5 times — before generation continues; otherwise you're asked to enter it yourself."));
  }

  function renderGenStep2(stage) {
    stage.appendChild(heading('2. Section-by-Section Generation'));
    stage.appendChild(row(
      iconBox(Icons.magnifier, 'Suggest relevant items', 0),
      arrowEl(150),
      iconBox(Icons.spreadsheet, 'Extract verified data', 300),
      arrowEl(450),
      iconBox(Icons.sparkle, 'Write narrative', 600)
    ));
    stage.appendChild(snippet({
      role: GENERATOR_EXAMPLE.personnelLabel,
      total_salary: GENERATOR_EXAMPLE.personnelSalary
    }, 800));
    stage.appendChild(caption('Each section is generated in two passes: the AI first extracts numbers straight from your spreadsheet, then writes the narrative around them in a second pass. Every total is recomputed afterward from its own year-by-year breakdown, so the writing pass can never quietly change a figure.'));
  }

  function renderGenStep3(stage) {
    stage.appendChild(heading('3. Validation'));
    stage.appendChild(row(
      iconBox(Icons.magnifier, 'Recompute grand total', 0),
      arrowEl(150),
      chip('Matches Total Budget?', '', 300)
    ));
    stage.appendChild(caption('Before you ever see the draft, Just-In-Time recomputes the grand total from every line item and compares it to the Total Budget confirmed in step 1. Either way, you decide: keep this draft, or generate a new one from scratch.'));
  }

  function renderGenStep4(stage) {
    stage.appendChild(heading('4. The Editor'));
    stage.appendChild(row(
      chip(`$${GENERATOR_EXAMPLE.personnelSalary.toLocaleString()}`, 'match', 0),
      iconBox(Icons.spreadsheet, GENERATOR_EXAMPLE.linkedCell, 150)
    ));
    stage.appendChild(row(
      chip(`$${GENERATOR_EXAMPLE.totalBudget.toLocaleString()}`, 'calculated', 350),
      iconBox(Icons.sparkle, GENERATOR_EXAMPLE.calculatedLabel, 500)
    ));
    stage.appendChild(caption('Every dollar figure in the kept draft is either Linked to the exact spreadsheet cell it came from, or Calculated as a sum of other figures — click any one to see where it comes from, relink it, or edit its formula. Everything else is free text you can edit directly.'));
  }

  function renderGenStep5(stage) {
    stage.appendChild(heading('Try it out!'));
    stage.appendChild(caption('See it for yourself with two sample documents — download them, upload them, and watch Just-In-Time build a first draft.'));
    stage.appendChild(tryItButton(200, () => TryItTutorial.startGenerate()));
  }

  const VERIFIER_STEPS = [
    { render: renderVerifyStep1 },
    { render: renderVerifyStep2 },
    { render: renderVerifyStep3 },
    { render: renderVerifyStep4 },
    { render: renderVerifyStep5 },
    { render: renderVerifyStep6 }
  ];

  const GENERATOR_STEPS = [
    { render: renderGenStep1 },
    { render: renderGenStep2 },
    { render: renderGenStep3 },
    { render: renderGenStep4 },
    { render: renderGenStep5 }
  ];

  let flow = null;

  function modalEl() { return document.getElementById('how-it-works-modal'); }
  function flowEl()  { return document.getElementById('how-it-works-flow'); }

  function openModal() {
    const isGenerator = document.querySelector('.tab-btn.active')?.dataset.tab === 'generator';

    document.getElementById('how-it-works-intro').textContent = isGenerator ? INTROS.generator : INTROS.verify;
    modalEl().classList.remove('hidden');
    flow = StepFlow.create({
      container: flowEl(),
      steps: isGenerator ? GENERATOR_STEPS : VERIFIER_STEPS,
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
