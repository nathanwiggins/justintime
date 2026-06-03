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

    const row  = document.createElement('div');
    row.className = 'step-row';

    const icon = document.createElement('span');
    icon.className   = 'step-icon spinning';
    icon.textContent = '↻';

    const text = document.createElement('span');
    text.className   = 'step-text';
    text.textContent = label;

    row.appendChild(icon);
    row.appendChild(text);
    item.appendChild(row);
    log.appendChild(item);

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
      done(summary, sections) {
        item.className   = 'step-item done';
        icon.className   = 'step-icon';
        icon.textContent = '✓';
        if (summary) text.textContent = label + ' — ' + summary;
        if (sections && sections.length) attachDetails(sections);
      },
      error(summary) {
        item.className   = 'step-item error';
        icon.className   = 'step-icon';
        icon.textContent = '✗';
        if (summary) text.textContent = label + ' — ' + summary;
      }
    };
  }

  function getFormValues() {
    return {
      profileId:    document.getElementById('profile-select').value,
      templateType: document.getElementById('template-select').value,
      file:         document.getElementById('budget-file-input').files[0],
      summaryFile:  document.getElementById('project-summary-input').files[0],
      apiKey:       Settings.loadApiKey()
    };
  }

  function validateForm({ profileId, file, summaryFile, apiKey }) {
    if (!apiKey)      return 'No API key saved. Go to the Settings tab and save your Gemini API key.';
    if (!profileId)   return 'Please select an Institutional Profile.';
    if (!file)        return 'Please upload a budget file (.csv, .xls, or .xlsx).';
    if (!summaryFile) return 'Please upload a project summary (.docx).';
    return null;
  }

  async function parseSummaryFile(file) {
    if (file.name.toLowerCase().endsWith('.doc') && !file.name.toLowerCase().endsWith('.docx')) {
      throw new Error('Legacy .doc files cannot be parsed in the browser. Please re-save the file as .docx and re-upload.');
    }
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (!result.value.trim()) throw new Error('Project summary document appears to be empty.');
    return result.value.trim();
  }

  function injectBoilerplate(aiJson, profile) {
    return {
      ...aiJson,
      profile_name:       profile.name              || '',
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
      const summaryStep = addStep('Parsing project summary');
      const projectSummary = await parseSummaryFile(form.summaryFile);
      summaryStep.done(form.summaryFile.name);

      const parseStep = addStep('Parsing budget file');
      const { csvText, sourceTruth } = await Parser.parse(form.file);
      parseStep.done(form.file.name, [
        { label: 'Extracted CSV',  content: csvText },
        { label: 'Source Truth',   content: JSON.stringify(sourceTruth, null, 2) }
      ]);

      const sections = Sections.forTemplate(form.templateType).filter(s => s.key === 'senior_personnel');
      const aiJson   = {};

      for (const section of sections) {
        const sectionStep = addStep(`Generating: ${section.label}`);
        const { result, prompt } = await Api.generateSection({
          csvText,
          projectSummary,
          templateType:   form.templateType,
          apiKey:         form.apiKey,
          section
        });
        Object.assign(aiJson, result);
        sectionStep.done('done', [
          { label: 'Prompt Sent',        content: prompt },
          { label: 'Section Response',   content: JSON.stringify(result, null, 2) }
        ]);
      }

      const boilerplateStep = addStep('Injecting institutional boilerplate');
      const payload = injectBoilerplate(aiJson, profile);
      boilerplateStep.done(profile.name, [
        { label: 'Final Payload', content: JSON.stringify(payload, null, 2) }
      ]);

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
