const TryItTutorial = (() => {
  const JUSTIFICATION_FILE = 'examples/NSF_5_Year_Budget_Justification.docx';
  const BUDGET_FILE        = 'examples/NSF_5_Year_Budget_Banister_Bacon.xlsx';

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

  function switchToVerifyTab() {
    const tabBtn = document.querySelector('.tab-btn[data-tab="verify"]');
    if (tabBtn && !tabBtn.classList.contains('active')) tabBtn.click();
  }

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

  function showDownloadStage() {
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

    const intro = document.createElement('p');
    intro.textContent = "Download these two sample documents — a budget justification and its matching spreadsheet — then come back here to upload them.";
    body.appendChild(intro);

    const list = document.createElement('div');
    list.className = 'tutorial-sample-list';
    list.appendChild(sampleItem(Icons.document, 'Sample Budget Justification (.docx)', JUSTIFICATION_FILE));
    list.appendChild(sampleItem(Icons.spreadsheet, 'Sample Budget Spreadsheet (.xlsx)', BUDGET_FILE));
    body.appendChild(list);

    const hint = document.createElement('p');
    hint.className = 'tutorial-hint';
    hint.textContent = "Downloaded both? Continue whenever you're ready.";
    body.appendChild(hint);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'btn btn-primary';
    continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('click', showUploadStage);
    footer.appendChild(continueBtn);

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(overlay);
    modal.appendChild(content);
    document.body.appendChild(modal);

    onStage(() => modal.remove());
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

  return { start };
})();
