const TryItTutorial = (() => {
  const JUSTIFICATION_FILE      = 'examples/NSF_1_Year_Budget_Justification.docx';
  const BUDGET_FILE             = 'examples/NSF_1_Year_Budget_Banister_Bacon.xlsx';
  const PROJECT_NARRATIVE_FILE  = 'examples/NSF_1_Year_Project%20Narrative.docx';

  let active = false;
  let stageCleanup = [];

  function onStage(fn) { stageCleanup.push(fn); }

  function clearStage() {
    stageCleanup.forEach(fn => fn());
    stageCleanup = [];
  }

  function onKeydown(e) {
    if (e.key === 'Escape') stop();
  }

  function stop() {
    if (!active) return;
    active = false;
    clearStage();
    document.removeEventListener('keydown', onKeydown);
  }

  function exitBtn() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-icon tutorial-exit-btn';
    btn.setAttribute('aria-label', 'Exit tutorial');
    btn.innerHTML = '&times;';
    btn.addEventListener('click', stop);
    return btn;
  }

  function guideCard(text) {
    const card = document.createElement('div');
    card.className = 'tutorial-guide-card';
    const p = document.createElement('p');
    p.textContent = text;
    card.appendChild(p);
    card.appendChild(exitBtn());
    document.body.appendChild(card);
    onStage(() => card.remove());
    return card;
  }

  function pointAt(target, text) {
    const wrap = document.createElement('div');
    wrap.className = 'tutorial-pointer';
    const bubble = document.createElement('div');
    bubble.className = 'tutorial-pointer-bubble';
    bubble.textContent = text;
    const arrow = document.createElement('div');
    arrow.className = 'tutorial-pointer-arrow';
    wrap.appendChild(bubble);
    wrap.appendChild(arrow);
    document.body.appendChild(wrap);

    function reposition() {
      const rect = target.getBoundingClientRect();
      const below = rect.top < wrap.offsetHeight + 16;
      wrap.classList.toggle('tutorial-pointer-below', below);
      wrap.style.top = below
        ? `${rect.bottom + 10}px`
        : `${rect.top - wrap.offsetHeight - 10}px`;
      let left = rect.left + rect.width / 2 - wrap.offsetWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - wrap.offsetWidth - 8));
      wrap.style.left = `${left}px`;
    }

    function destroy() {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      wrap.remove();
    }

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    onStage(destroy);

    return { destroy };
  }

  function switchToTab(name) {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
    if (tabBtn && !tabBtn.classList.contains('active')) tabBtn.click();
  }

  function switchToVerifyTab()    { switchToTab('verify'); }
  function switchToGeneratorTab() { switchToTab('generator'); }

  function sampleItem(iconSvg, name, href) {
    const item = document.createElement('div');
    item.className = 'tutorial-sample-item';

    const icon = document.createElement('span');
    icon.className = 'tutorial-sample-icon';
    icon.innerHTML = iconSvg;

    const name_ = document.createElement('div');
    name_.className = 'tutorial-sample-name';
    name_.textContent = name;

    const link = document.createElement('a');
    link.href = href;
    link.download = '';
    link.className = 'btn btn-secondary btn-sm';
    link.textContent = 'Download';
    link.addEventListener('click', () => {
      link.textContent = 'Downloaded ✓';
      link.classList.add('tutorial-downloaded');
    });

    item.appendChild(icon);
    item.appendChild(name_);
    item.appendChild(link);
    return item;
  }

  function showDownloadModal({ intro, samples, onContinue }) {
    clearStage();

    const modal = document.createElement('div');
    modal.className = 'modal tutorial-download-modal';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const header = document.createElement('div');
    header.className = 'modal-header';
    const title = document.createElement('h3');
    title.textContent = 'Try it out!';
    header.appendChild(title);
    header.appendChild(exitBtn());

    const body = document.createElement('div');
    body.className = 'modal-body';

    const introEl = document.createElement('p');
    introEl.textContent = intro;
    body.appendChild(introEl);

    const list = document.createElement('div');
    list.className = 'tutorial-sample-list';
    samples.forEach(s => list.appendChild(sampleItem(s.icon, s.name, s.href)));
    body.appendChild(list);

    const hint = document.createElement('p');
    hint.className = 'tutorial-hint';
    hint.textContent = "Downloaded them all? Continue whenever you're ready.";
    body.appendChild(hint);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'btn btn-primary';
    continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('click', onContinue);
    footer.appendChild(continueBtn);

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(overlay);
    modal.appendChild(content);
    document.body.appendChild(modal);

    onStage(() => modal.remove());
  }

  // --- Verifier flow ---

  function showDownloadStage() {
    showDownloadModal({
      intro: 'Download these two sample documents — a budget justification and its matching spreadsheet — then come back here to upload them.',
      samples: [
        { icon: Icons.document, name: 'Sample Budget Justification (.docx)', href: JUSTIFICATION_FILE },
        { icon: Icons.spreadsheet, name: 'Sample Budget Spreadsheet (.xlsx)', href: BUDGET_FILE }
      ],
      onContinue: showUploadStage
    });
  }

  function showUploadStage() {
    clearStage();
    switchToVerifyTab();

    guideCard('Upload the two sample files you just downloaded into the matching drop zones below.');
    const justPointer   = pointAt(document.getElementById('verify-justification-drop-zone'), 'Upload the justification document here');
    const budgetPointer = pointAt(document.getElementById('verify-budget-drop-zone'), 'Upload the budget spreadsheet here');

    const justInput   = document.getElementById('verify-justification-input');
    const budgetInput = document.getElementById('verify-budget-input');

    let justUploaded   = !!justInput.files.length;
    let budgetUploaded = !!budgetInput.files.length;

    function checkDone() {
      if (justUploaded && budgetUploaded) showVerifyStage(showFirstResultStage);
    }

    function onJust()   { justUploaded = true; justPointer.destroy(); checkDone(); }
    function onBudget()  { budgetUploaded = true; budgetPointer.destroy(); checkDone(); }

    justInput.addEventListener('change', onJust);
    budgetInput.addEventListener('change', onBudget);
    onStage(() => {
      justInput.removeEventListener('change', onJust);
      budgetInput.removeEventListener('change', onBudget);
    });

    checkDone();
  }

  function showVerifyStage(onDone) {
    clearStage();

    guideCard("Now click \"Verify Budget\" to run the check.");
    const verifyBtn = document.getElementById('verify-btn');
    const verifyPointer = pointAt(verifyBtn, 'Click here to verify');

    function onClick() { verifyPointer.destroy(); }
    verifyBtn.addEventListener('click', onClick, { once: true });
    onStage(() => verifyBtn.removeEventListener('click', onClick));

    function onComplete() { onDone(); }
    document.addEventListener('verify:complete', onComplete, { once: true });
    onStage(() => document.removeEventListener('verify:complete', onComplete));
  }

  function showFirstResultStage() {
    clearStage();

    guideCard('Nice! Now try editing a value in the spreadsheet you downloaded — change a dollar amount, save it, and upload the edited file here to see if Just-In-Time catches the discrepancy.');
    const reuploadPointer = pointAt(document.getElementById('verify-budget-drop-zone'), 'Re-upload the edited spreadsheet here');

    const budgetInput = document.getElementById('verify-budget-input');
    function onReupload() { reuploadPointer.destroy(); showVerifyStage(finish); }
    budgetInput.addEventListener('change', onReupload);
    onStage(() => budgetInput.removeEventListener('change', onReupload));
  }

  function finish() {
    clearStage();
    guideCard("That's it — you've seen Just-In-Time catch a real mismatch. Explore on your own from here!");
    setTimeout(stop, 6000);
  }

  function start() {
    if (active) return;
    active = true;
    document.addEventListener('keydown', onKeydown);
    switchToVerifyTab();
    showDownloadStage();
  }

  // --- Generator flow ---

  function showGenerateDownloadStage() {
    showDownloadModal({
      intro: 'Download these two sample documents — a project summary and its matching budget spreadsheet — then come back here to upload them.',
      samples: [
        { icon: Icons.document, name: 'Sample Project Summary (.docx)', href: PROJECT_NARRATIVE_FILE },
        { icon: Icons.spreadsheet, name: 'Sample Budget Spreadsheet (.xlsx)', href: BUDGET_FILE }
      ],
      onContinue: showGenerateSetupStage
    });
  }

  function showGenerateSetupStage() {
    clearStage();
    switchToGeneratorTab();

    guideCard('Select any Institutional Profile and a Grant Template Type above, then continue.');
    const profilePointer  = pointAt(document.getElementById('profile-select'), 'Choose a profile');
    const templatePointer = pointAt(document.getElementById('template-select'), 'Choose a template type');

    const profileSelect  = document.getElementById('profile-select');
    const templateSelect = document.getElementById('template-select');

    let profileChosen  = !!profileSelect.value;
    let templateChosen = !!templateSelect.value;

    function checkDone() {
      if (profileChosen && templateChosen) showGenerateUploadStage();
    }

    function onProfile()  { profileChosen = true; profilePointer.destroy(); checkDone(); }
    function onTemplate() { templateChosen = true; templatePointer.destroy(); checkDone(); }

    profileSelect.addEventListener('change', onProfile);
    templateSelect.addEventListener('change', onTemplate);
    onStage(() => {
      profileSelect.removeEventListener('change', onProfile);
      templateSelect.removeEventListener('change', onTemplate);
    });

    checkDone();
  }

  function showGenerateUploadStage() {
    clearStage();

    guideCard('Now upload the two sample files you just downloaded into the matching drop zones below.');
    const summaryPointer = pointAt(document.getElementById('summary-drop-zone'), 'Upload the project summary here');
    const budgetPointer  = pointAt(document.getElementById('budget-drop-zone'), 'Upload the budget spreadsheet here');

    const summaryInput = document.getElementById('project-summary-input');
    const budgetInput  = document.getElementById('budget-file-input');

    let summaryUploaded = !!summaryInput.files.length;
    let budgetUploaded  = !!budgetInput.files.length;

    function checkDone() {
      if (summaryUploaded && budgetUploaded) showGenerateClickStage();
    }

    function onSummary() { summaryUploaded = true; summaryPointer.destroy(); checkDone(); }
    function onBudget()  { budgetUploaded = true; budgetPointer.destroy(); checkDone(); }

    summaryInput.addEventListener('change', onSummary);
    budgetInput.addEventListener('change', onBudget);
    onStage(() => {
      summaryInput.removeEventListener('change', onSummary);
      budgetInput.removeEventListener('change', onBudget);
    });

    checkDone();
  }

  function showGenerateClickStage() {
    clearStage();

    guideCard('Click "Generate Justification" to build your first draft. This uses AI and may take a minute or two.');
    const generateBtn = document.getElementById('generate-btn');
    const generatePointer = pointAt(generateBtn, 'Click here to generate');

    function onClick() { generatePointer.destroy(); }
    generateBtn.addEventListener('click', onClick, { once: true });
    onStage(() => generateBtn.removeEventListener('click', onClick));

    function onComplete() { finishGenerate(); }
    document.addEventListener('generate:complete', onComplete, { once: true });
    onStage(() => document.removeEventListener('generate:complete', onComplete));
  }

  function finishGenerate() {
    clearStage();
    guideCard("Nice! You've got a starting draft — click any dollar figure to see if it's Linked to your spreadsheet or Calculated from other values, and edit any text directly. Explore on your own from here!");
    setTimeout(stop, 6000);
  }

  function startGenerate() {
    if (active) return;
    active = true;
    document.addEventListener('keydown', onKeydown);
    switchToGeneratorTab();
    showGenerateDownloadStage();
  }

  return { start, startGenerate };
})();
