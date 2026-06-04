const Generator = (() => {
  let currentTemplate = 'nsf';
  let summaryMode     = 'file';

  function syncProfileDropdown() {
    const select    = document.getElementById('profile-select');
    const profiles  = Settings.getProfiles();
    const current   = select.value;

    while (select.options.length > 1) select.remove(1);

    profiles.forEach(p => {
      const opt       = document.createElement('option');
      opt.value       = p.id;
      opt.textContent = p.name;
      select.appendChild(opt);
    });

    if (profiles.some(p => p.id === current)) {
      select.value = current;
    } else {
      const defaultId = Settings.getDefaultProfileId();
      if (defaultId && profiles.some(p => p.id === defaultId)) {
        select.value = defaultId;
      }
    }
  }

  function setStatus(msg, type = '') {
    const el       = document.getElementById('generate-status');
    el.textContent = msg;
    el.className   = 'status-message' + (type ? ' ' + type : '');
  }

  function setGenerating(active) {
    document.getElementById('generate-btn').disabled = active;
    document.getElementById('loading-indicator').classList.toggle('hidden', !active);
  }

  function clearStepLog() {
    const log    = document.getElementById('step-log');
    const toggle = document.getElementById('log-toggle');
    log.innerHTML = '';
    log.classList.add('hidden');
    toggle.classList.remove('hidden');
    toggle.textContent = 'Show details';
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
      summaryText:  document.getElementById('project-summary-text-input').value.trim(),
      summaryMode,
      templateMode: document.getElementById('template-mode-toggle').checked,
      apiKey:       Settings.loadApiKey()
    };
  }

  function stripNarratives(obj) {
    const NARRATIVE_FIELDS = new Set([
      'narrative_description',
      'narrative_justification',
      'justification'
    ]);

    function walk(node) {
      if (Array.isArray(node)) {
        node.forEach(walk);
      } else if (node && typeof node === 'object') {
        Object.keys(node).forEach(key => {
          if (key === 'fringe_benefits') return;
          if (key === 'indirect_costs')  return;
          if (NARRATIVE_FIELDS.has(key) && typeof node[key] === 'string' && node[key]) {
            node[key] = '[Justification required]';
          } else {
            walk(node[key]);
          }
        });
      }
    }

    walk(obj);
    return obj;
  }

  function validateForm({ profileId, file, summaryFile, summaryText, summaryMode, apiKey }) {
    if (!apiKey)    return 'No API key saved. Go to the Settings tab and save your Gemini API key.';
    if (!profileId) return 'Please select an Institutional Profile.';
    if (!file)      return 'Please upload a budget file (.csv, .xls, or .xlsx).';
    if (summaryMode === 'file' && !summaryFile) return 'Please upload a project summary (.doc or .docx).';
    if (summaryMode === 'text' && !summaryText) return 'Please enter a project summary.';
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

  function assemblePayload(aiJson, profile, numYears) {
    return {
      ...aiJson,
      profile_name:       profile.name              || '',
      num_project_years:  numYears || 0
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
      let projectSummary;
      if (form.summaryMode === 'file') {
        const summaryStep = addStep('Parsing project summary');
        projectSummary = await parseSummaryFile(form.summaryFile);
        summaryStep.done(form.summaryFile.name, [
          { label: 'Extracted Text', content: projectSummary }
        ]);
      } else {
        projectSummary = form.summaryText;
      }

      const parseStep = addStep('Parsing budget file');
      const { csvText, sourceTruth, numYears } = await Parser.parse(form.file);
      parseStep.done(form.file.name, [
        { label: 'Extracted CSV',  content: csvText },
        { label: 'Source Truth',   content: JSON.stringify(sourceTruth, null, 2) }
      ]);

      const sections = Sections.forTemplate(form.templateType);
      const aiJson   = {};

      for (const section of sections) {
        const additionalContext = section.key === 'fringe_benefits' ? profile.fringeBoilerplate
          : section.key === 'indirect_costs'   ? profile.faBoilerplate
          : null;
        const sectionStep = addStep(`Generating: ${section.label}`);
        const { result, prompt } = await Api.generateSection({
          csvText,
          projectSummary,
          templateType:   form.templateType,
          apiKey:         form.apiKey,
          section,
          additionalContext
        });
        Object.assign(aiJson, result);
        sectionStep.done('done', [
          { label: 'Prompt Sent',        content: prompt },
          { label: 'Section Response',   content: JSON.stringify(result, null, 2) }
        ]);
      }

      if (form.templateMode) {
        const templateStep = addStep('Applying Template Mode');
        stripNarratives(aiJson);
        templateStep.done('narrative fields replaced with placeholders');
      }

      const boilerplateStep = addStep('Assembling final payload');
      const payload = assemblePayload(aiJson, profile, numYears);
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

  function initDropZone(zoneId, inputId, filenameId) {
    const zone     = document.getElementById(zoneId);
    const input    = document.getElementById(inputId);
    const filename = document.getElementById(filenameId);

    function showFile(file) {
      filename.textContent = file.name;
      filename.classList.remove('hidden');
      zone.querySelector('.drop-zone-content').classList.add('hidden');
    }

    input.addEventListener('change', () => {
      if (input.files[0]) showFile(input.files[0]);
    });

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      showFile(file);
    });
  }

  function init() {
    syncProfileDropdown();
    document.getElementById('generate-btn').addEventListener('click', handleGenerate);

    initDropZone('budget-drop-zone',  'budget-file-input',       'budget-filename');
    initDropZone('summary-drop-zone', 'project-summary-input',   'summary-filename');

    document.getElementById('log-toggle').addEventListener('click', () => {
      const log    = document.getElementById('step-log');
      const toggle = document.getElementById('log-toggle');
      const hidden = log.classList.toggle('hidden');
      toggle.textContent = hidden ? 'Show details' : 'Hide details';
    });

    document.getElementById('summary-toggle').addEventListener('click', () => {
      summaryMode = summaryMode === 'file' ? 'text' : 'file';

      const fileZone  = document.getElementById('summary-drop-zone');
      const textInput = document.getElementById('project-summary-text-input');
      const toggleBtn = document.getElementById('summary-toggle');

      const isFile = summaryMode === 'file';
      fileZone.classList.toggle('hidden', !isFile);
      textInput.classList.toggle('hidden', isFile);
      toggleBtn.textContent = isFile ? 'Type instead' : 'Upload document';
    });
  }

  return { init, syncProfileDropdown };
})();
