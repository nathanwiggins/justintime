const Generator = (() => {
  let currentTemplate = 'nih-detailed';

  function syncProfileDropdown() {
    const select   = document.getElementById('profile-select');
    const profiles = Settings.getProfiles();
    const current  = select.value;

    while (select.options.length > 1) select.remove(1);

    profiles.forEach(p => {
      const opt       = document.createElement('option');
      opt.value       = p.id;
      opt.textContent = p.name;
      select.appendChild(opt);
    });

    if (profiles.some(p => p.id === current)) select.value = current;
  }

  function setStatus(msg, type = '') {
    const el       = document.getElementById('generate-status');
    el.textContent = msg;
    el.className   = 'status-message' + (type ? ' ' + type : '');
  }

  function setGenerating(active) {
    document.getElementById('generate-btn').disabled = active;
  }

  function clearStepLog() {
    const log = document.getElementById('step-log');
    log.innerHTML = '';
    log.classList.remove('hidden');
  }

  function addStep(label) {
    const log  = document.getElementById('step-log');
    const item = document.createElement('div');
    item.className = 'step-item running';

    const icon = document.createElement('span');
    icon.className   = 'step-icon spinning';
    icon.textContent = '↻';

    const text = document.createElement('span');
    text.textContent = label;

    item.appendChild(icon);
    item.appendChild(text);
    log.appendChild(item);

    return {
      done(detail) {
        item.className   = 'step-item done';
        icon.className   = 'step-icon';
        icon.textContent = '✓';
        if (detail) text.textContent = label + ' — ' + detail;
      },
      error(detail) {
        item.className   = 'step-item error';
        icon.className   = 'step-icon';
        icon.textContent = '✗';
        if (detail) text.textContent = label + ' — ' + detail;
      }
    };
  }

  function getFormValues() {
    return {
      profileId:    document.getElementById('profile-select').value,
      templateType: document.getElementById('template-select').value,
      file:         document.getElementById('budget-file-input').files[0],
      summary:      document.getElementById('project-summary-input').value.trim(),
      apiKey:       Settings.loadApiKey()
    };
  }

  function validateForm({ profileId, file, summary, apiKey }) {
    if (!apiKey)    return 'No API key saved. Go to the Settings tab and save your Gemini API key.';
    if (!profileId) return 'Please select an Institutional Profile.';
    if (!file)      return 'Please upload a budget file (.csv, .xls, or .xlsx).';
    if (!summary)   return 'Please enter a Project Summary.';
    return null;
  }

  function injectBoilerplate(aiJson, profile) {
    return {
      ...aiJson,
      fringe_boilerplate: profile.fringeBoilerplate || '',
      fa_boilerplate:     profile.faBoilerplate     || ''
    };
  }

  async function handleGenerate() {
    const form  = getFormValues();
    const error = validateForm(form);
    if (error) { setStatus(error, 'error'); return; }

    const profile = Settings.getProfileById(form.profileId);
    if (!profile) { setStatus('Selected profile not found. Please reselect.', 'error'); return; }

    setGenerating(true);
    setStatus('');
    clearStepLog();
    currentTemplate = form.templateType;

    try {
      const parseStep = addStep('Parsing budget file');
      const { csvText } = await Parser.parse(form.file);
      parseStep.done(form.file.name);

      const apiStep = addStep('Calling Gemini API');
      const aiJson  = await Api.generate({ csvText, projectSummary: form.summary, templateType: form.templateType, apiKey: form.apiKey });
      apiStep.done('response received');

      const boilerplateStep = addStep('Injecting institutional boilerplate');
      const payload = injectBoilerplate(aiJson, profile);
      boilerplateStep.done(profile.name);

      const docStep = addStep('Building Word document');
      await Document.generate(form.templateType, payload);
      docStep.done('download started');

      setStatus('Document downloaded successfully.', 'success');
      setGenerating(false);
    } catch (err) {
      setGenerating(false);
      setStatus('Error: ' + err.message, 'error');
    }
  }

  function init() {
    syncProfileDropdown();
    document.getElementById('generate-btn').addEventListener('click', handleGenerate);
  }

  return { init, syncProfileDropdown };
})();
