const Generator = (() => {
  let sourceTruth     = {};
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

  function showValidationBanner(mismatches, aiJson) {
    const banner   = document.getElementById('validation-banner');
    const msgEl    = document.getElementById('validation-message');
    const editArea = document.getElementById('json-edit-area');

    msgEl.textContent = mismatches.map(m =>
      `• ${m.label}: AI generated $${m.aiAmount.toLocaleString()} — budget file shows $${m.truthAmount.toLocaleString()} (difference: $${m.difference.toLocaleString()})`
    ).join('\n');

    editArea.value = JSON.stringify(aiJson, null, 2);
    banner.classList.remove('hidden');
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideValidationBanner() {
    document.getElementById('validation-banner').classList.add('hidden');
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

  async function callAndValidate(csvText, templateType, summary, apiKey, profile) {
    setStatus('Calling Gemini API…', 'loading');
    const aiJson = await Api.generate({ csvText, projectSummary: summary, templateType, apiKey });

    setStatus('Validating amounts…', 'loading');
    const { valid, mismatches } = Validator.validate(aiJson, sourceTruth);

    if (!valid) {
      showValidationBanner(mismatches, aiJson);
      setStatus('Validation found mismatches. Review the banner below.', 'error');
      setGenerating(false);
      return;
    }

    const payload = injectBoilerplate(aiJson, profile);
    setStatus('Generating document…', 'loading');
    await Document.generate(templateType, payload);
    setStatus('Document downloaded successfully.', 'success');
    setGenerating(false);
  }

  async function handleGenerate() {
    const form  = getFormValues();
    const error = validateForm(form);
    if (error) { setStatus(error, 'error'); return; }

    const profile = Settings.getProfileById(form.profileId);
    if (!profile) { setStatus('Selected profile not found. Please reselect.', 'error'); return; }

    hideValidationBanner();
    setGenerating(true);
    currentTemplate = form.templateType;

    try {
      setStatus('Parsing budget file…', 'loading');
      const { csvText, sourceTruth: st } = await Parser.parse(form.file);
      sourceTruth = st;

      await callAndValidate(csvText, form.templateType, form.summary, form.apiKey, profile);
    } catch (err) {
      setGenerating(false);
      setStatus('Error: ' + err.message, 'error');
    }
  }

  async function handleForceRegenerate() {
    const form    = getFormValues();
    const profile = Settings.getProfileById(form.profileId);

    hideValidationBanner();
    setGenerating(true);

    try {
      setStatus('Parsing budget file…', 'loading');
      const { csvText } = await Parser.parse(form.file);
      const summary = form.summary +
        '\n\nIMPORTANT: All dollar amounts must exactly match the values in the provided budget spreadsheet.';

      await callAndValidate(csvText, currentTemplate, summary, form.apiKey, profile);
    } catch (err) {
      setGenerating(false);
      setStatus('Error: ' + err.message, 'error');
    }
  }

  async function handleDismissAndProceed() {
    const profileId = document.getElementById('profile-select').value;
    const profile   = Settings.getProfileById(profileId);
    const editArea  = document.getElementById('json-edit-area');

    let editedJson;
    try {
      editedJson = JSON.parse(editArea.value);
    } catch {
      setStatus('Invalid JSON in the edit area. Fix the syntax before proceeding.', 'error');
      return;
    }

    hideValidationBanner();
    setGenerating(true);
    setStatus('Generating document…', 'loading');

    try {
      const payload = injectBoilerplate(editedJson, profile);
      await Document.generate(currentTemplate, payload);
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
    document.getElementById('force-regenerate-btn').addEventListener('click', handleForceRegenerate);
    document.getElementById('dismiss-banner-btn').addEventListener('click', handleDismissAndProceed);
  }

  return { init, syncProfileDropdown };
})();
