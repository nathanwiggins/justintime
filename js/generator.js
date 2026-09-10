const Generator = (() => {
  let currentTemplate = 'nsf';
  let summaryMode     = 'file';

  const NARRATIVE_FIELDS = new Set([
    'narrative_description',
    'narrative_justification',
    'justification'
  ]);

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

    const timer = document.createElement('span');
    timer.className   = 'step-timer';
    timer.textContent = '0s';

    row.appendChild(icon);
    row.appendChild(text);
    row.appendChild(timer);
    item.appendChild(row);
    log.appendChild(item);

    const startTime = Date.now();
    const interval  = setInterval(() => {
      timer.textContent = Math.floor((Date.now() - startTime) / 1000) + 's';
    }, 1000);

    function stopTimer() {
      clearInterval(interval);
      timer.textContent = Math.floor((Date.now() - startTime) / 1000) + 's';
    }

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
        stopTimer();
        item.className   = 'step-item done';
        icon.className   = 'step-icon';
        icon.textContent = '✓';
        if (summary) text.textContent = label + ' — ' + summary;
        if (sections && sections.length) attachDetails(sections);
      },
      error(summary) {
        stopTimer();
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

  function omitNarrativeFields(node) {
    if (Array.isArray(node)) return node.map(omitNarrativeFields);
    if (node && typeof node === 'object') {
      const out = {};
      Object.keys(node).forEach(key => {
        if (NARRATIVE_FIELDS.has(key)) return;
        out[key] = omitNarrativeFields(node[key]);
      });
      return out;
    }
    return node;
  }

  function diffSkeletons(trusted, candidate, path = '') {
    if (Array.isArray(trusted)) {
      if (!Array.isArray(candidate) || candidate.length !== trusted.length) {
        return { structural: true, reason: `${path || 'root'}: expected ${trusted.length} item(s), got ${Array.isArray(candidate) ? candidate.length : typeof candidate}` };
      }
      const mismatches = [];
      for (let i = 0; i < trusted.length; i++) {
        const sub = diffSkeletons(trusted[i], candidate[i], `${path}[${i}]`);
        if (sub.structural) return sub;
        mismatches.push(...sub.mismatches);
      }
      return { structural: false, mismatches };
    }

    if (trusted && typeof trusted === 'object') {
      if (!candidate || typeof candidate !== 'object') {
        return { structural: true, reason: `${path || 'root'}: expected an object, got ${typeof candidate}` };
      }
      const mismatches = [];
      for (const key of Object.keys(trusted)) {
        const sub = diffSkeletons(trusted[key], candidate[key], path ? `${path}.${key}` : key);
        if (sub.structural) return sub;
        mismatches.push(...sub.mismatches);
      }
      return { structural: false, mismatches };
    }

    return { structural: false, mismatches: trusted === candidate ? [] : [{ path, trusted, candidate }] };
  }

  function applyHeals(target, mismatches) {
    mismatches.forEach(({ path, trusted }) => {
      const parts = path.match(/[^.[\]]+/g) || [];
      let node = target;
      for (let i = 0; i < parts.length - 1; i++) {
        node = node[/^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i]];
      }
      const lastKey = parts[parts.length - 1];
      node[/^\d+$/.test(lastKey) ? Number(lastKey) : lastKey] = trusted;
    });
    return target;
  }

  function computeEscalationNote(yearlyBreakdown, subject) {
    const sorted = [...(yearlyBreakdown || [])].sort((a, b) => a.year - b.year);
    if (sorted.length < 2) return '';

    const deltas = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].cost;
      const curr = sorted[i].cost;
      if (!prev) return '';
      deltas.push(Math.round(((curr - prev) / prev) * 1000) / 10);
    }

    const rate = deltas[0];
    if (rate <= 0 || !deltas.every(d => d === rate)) return '';

    const pct = Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(1)}%`;
    return `${subject} reflects a ${pct} annual increase.`;
  }

  function applyComputedEscalationNotes(extracted) {
    (extracted.senior_personnel || []).forEach(x => {
      x.escalation_note = computeEscalationNote(x.yearly_breakdown, 'Salary');
    });
    (extracted.other_personnel || []).forEach(x => {
      x.escalation_note = computeEscalationNote(x.yearly_breakdown, 'Rate');
    });
  }

  const YEARLY_TOTAL_FIELDS = {
    senior_personnel:  'total_salary',
    other_personnel:   'total_cost',
    equipment:         'cost',
    domestic_travel:   'cost',
    foreign_travel:    'cost',
    materials_supplies:'cost',
    construction_costs:'cost',
    consultants:       'cost',
    subawards:         'cost',
    other_direct_lines:'cost',
    stipends:          'cost',
    participant_travel:'cost',
    subsistence:       'cost',
    participant_other: 'cost',
    publications:      'cost',
    computer_services: 'cost'
  };

  function sumYears(yearlyBreakdown) {
    return (yearlyBreakdown || []).reduce((sum, y) => sum + (y.cost || 0), 0);
  }

  function itemLabel(item, fallback) {
    return item.item_name || item.name || item.role || item.trip_purpose || item.category_name ||
      item.consultant_name || item.institution_name || item.publication_title_or_type ||
      item.service_description || fallback;
  }

  function reconcileYearlyTotals(extracted) {
    const flagged = [];

    Object.keys(YEARLY_TOTAL_FIELDS).forEach(key => {
      const totalField = YEARLY_TOTAL_FIELDS[key];
      (extracted[key] || []).forEach(item => {
        if (item.yearly_breakdown && item.yearly_breakdown.length) {
          item[totalField] = sumYears(item.yearly_breakdown);
        } else {
          flagged.push(`${key}: ${itemLabel(item, '(unnamed item)')}`);
        }
      });
    });

    if (extracted.fringe_benefits) {
      const fb = extracted.fringe_benefits;
      (fb.rate_groups || []).forEach(g => {
        if (g.yearly_breakdown && g.yearly_breakdown.length) {
          g.category_total = sumYears(g.yearly_breakdown);
        } else {
          flagged.push(`fringe_benefits.rate_groups: ${g.personnel_category || '(unnamed group)'}`);
        }
      });
      if (fb.rate_groups && fb.rate_groups.length) {
        fb.total_cost = fb.rate_groups.reduce((sum, g) => sum + (g.category_total || 0), 0);
      } else {
        flagged.push('fringe_benefits.total_cost');
      }
    }

    if (extracted.indirect_costs) {
      const ic = extracted.indirect_costs;
      if (ic.yearly_breakdown && ic.yearly_breakdown.length) {
        ic.total_cost = sumYears(ic.yearly_breakdown);
      } else {
        flagged.push('indirect_costs');
      }
    }

    return flagged;
  }

  function collectCapturedItems(aiJson) {
    const out = [];
    const add = (arr, labelFn) => (arr || []).forEach(x => {
      if (x.cost) out.push({ label: labelFn(x), cost: x.cost });
    });

    add(aiJson.equipment,            x => x.item_name);
    add(aiJson.domestic_travel,      x => x.trip_purpose);
    add(aiJson.foreign_travel,       x => x.trip_purpose);
    add(aiJson.materials_supplies,   x => x.category_name);
    add(aiJson.consultants,          x => x.consultant_name);
    add(aiJson.subawards,            x => x.institution_name);
    add(aiJson.construction_costs,   x => x.category_name);
    add(aiJson.stipends,             () => 'Participant Stipend');
    add(aiJson.participant_travel,   () => 'Participant Travel');
    add(aiJson.subsistence,          () => 'Participant Subsistence');
    add(aiJson.participant_other,    () => 'Participant Other Support');
    add(aiJson.publications,         x => x.publication_title_or_type);
    add(aiJson.computer_services,    x => x.service_description);

    return out;
  }

  function validateForm({ profileId, file, summaryFile, summaryText, summaryMode, apiKey }) {
    if (!apiKey && !Api.isVandalizerHosted())    return 'No API key saved. Go to the Settings tab and save your Gemini API key.';
    if (!profileId) return 'Please select an Institutional Profile.';
    if (!file)      return 'Please upload a budget file (.csv, .xls, or .xlsx).';
    if (summaryMode === 'file' && !summaryFile) return 'Please upload a project narrative (.doc, .docx, or .pdf).';
    if (summaryMode === 'text' && !summaryText) return 'Please enter a project summary.';
    return null;
  }

  async function parseSummaryFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.doc') && !name.endsWith('.docx')) {
      throw new Error('Legacy .doc files cannot be parsed in the browser. Please re-save the file as .docx and re-upload.');
    }
    const buffer = await file.arrayBuffer();
    if (name.endsWith('.pdf')) {
      const text = await extractPdfText(buffer);
      if (!text.trim()) throw new Error('Project narrative PDF appears to be empty or is a scanned image. Please use a text-based PDF or a .docx file.');
      return text.trim();
    }
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (!result.value.trim()) throw new Error('Project narrative document appears to be empty.');
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

      const MAX_NARRATIVE_ATTEMPTS = 2;

      for (const section of sections) {
        const additionalContext = section.key === 'fringe_benefits' ? profile.fringeBoilerplate
          : section.key === 'indirect_costs'   ? profile.faBoilerplate
          : null;
        const sectionStep = addStep(`Generating: ${section.label}`);

        const { result: extracted, prompt: extractPrompt } = await Api.generateSection({
          csvText,
          projectSummary,
          templateType:   form.templateType,
          apiKey:         form.apiKey,
          section,
          additionalContext,
          temperature:    0.1
        });
        applyComputedEscalationNotes(extracted);
        const flaggedTotals = reconcileYearlyTotals(extracted);
        const trustedSkeleton = omitNarrativeFields(extracted);

        let narrated, narrativePrompt, diff, correction = null;
        for (let attempt = 1; attempt <= MAX_NARRATIVE_ATTEMPTS; attempt++) {
          ({ result: narrated, prompt: narrativePrompt } = await Api.refineNarrative({
            csvText,
            projectSummary,
            templateType: form.templateType,
            apiKey:       form.apiKey,
            section,
            additionalContext,
            verifiedData: trustedSkeleton,
            correction
          }));
          diff = diffSkeletons(trustedSkeleton, omitNarrativeFields(narrated));
          if (!diff.structural) break;
          correction = diff.reason;
          if (attempt === MAX_NARRATIVE_ATTEMPTS) {
            sectionStep.error(`narrative pass dropped data (${diff.reason})`);
            throw new Error(`"${section.label}" failed to generate: the narrative pass altered the verified data (${diff.reason}).`);
          }
        }

        if (diff.mismatches.length) applyHeals(narrated, diff.mismatches);
        Object.assign(aiJson, narrated);

        sectionStep.done('done', [
          { label: 'Extraction Prompt',   content: extractPrompt },
          { label: 'Extracted Data',      content: JSON.stringify(extracted, null, 2) },
          { label: 'Narrative Prompt',    content: narrativePrompt },
          { label: 'Narrative Response',  content: JSON.stringify(narrated, null, 2) },
          ...(diff.mismatches.length ? [{ label: 'Self-Healed Fields', content: JSON.stringify(diff.mismatches, null, 2) }] : []),
          ...(flaggedTotals.length ? [{ label: 'Not Cross-Checked (no yearly breakdown)', content: JSON.stringify(flaggedTotals, null, 2) }] : [])
        ]);
      }

      if ((aiJson.other_direct_lines || []).length) {
        const captured = collectCapturedItems(aiJson);
        if (captured.length) {
          const dedupeStep = addStep('Checking Other category for duplicates');
          const audited     = await Api.auditOtherDuplicates(aiJson.other_direct_lines, captured, form.apiKey);
          const beforeCount = aiJson.other_direct_lines.length;
          aiJson.other_direct_lines = aiJson.other_direct_lines.filter((x, i) => !audited[i].is_duplicate);
          const removedCount = beforeCount - aiJson.other_direct_lines.length;
          dedupeStep.done(removedCount ? `${removedCount} duplicate item(s) removed` : 'no duplicates found', [
            { label: 'Audit Result', content: JSON.stringify(audited, null, 2) }
          ]);
        }
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
