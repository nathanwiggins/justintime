const EditorCanvas = (() => {
  let project    = null;
  let valueGraph = null;
  let payload    = null;
  let templateType = null;
  let sheets     = [];
  let activeSheetName = null;

  let pickingLinkFor    = null;
  let pickingFormulaFor = null;
  let formulaTermIds    = [];
  let selectedValueId   = null;

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function humanizeId(id) {
    if (id.startsWith('totals.')) return id.replace('totals.', '').replace(/([A-Z])/g, ' $1').trim();
    return id;
  }

  function renderPart(part, forValueGraph) {
    if ('text' in part) return document.createTextNode(part.text);

    const node = forValueGraph.nodes[part.valueId];
    const span = document.createElement('span');
    span.className = 'value-chip chip-' + (node ? node.kind : 'plain') + (node && node.broken ? ' chip-broken' : '');
    span.dataset.valueId = part.valueId;
    span.contentEditable = 'false';
    span.textContent = fmt(node ? node.amount : 0);
    return span;
  }

  function renderParts(container, parts, forValueGraph) {
    parts.forEach(part => container.appendChild(renderPart(part, forValueGraph)));
  }

  function renderBlock(block, forValueGraph, isInteractive) {
    if (block.type === 'title') {
      const el = document.createElement('h2');
      el.className = 'editor-title';
      el.textContent = block.text;
      return el;
    }
    if (block.type === 'subtitle') {
      const el = document.createElement('p');
      el.className = 'editor-subtitle';
      el.textContent = block.text;
      return el;
    }
    if (block.type === 'heading' || block.type === 'subheading') {
      const el = document.createElement(block.type === 'heading' ? 'h3' : 'h4');
      el.className = block.type === 'heading' ? 'editor-heading' : 'editor-subheading';
      renderParts(el, block.parts, forValueGraph);
      return el;
    }
    if (block.type === 'text') {
      const el = document.createElement('p');
      el.className = 'editor-paragraph';
      if (block.narrativePath) {
        const span = document.createElement('span');
        span.className = 'editor-narrative';
        span.contentEditable = isInteractive ? 'true' : 'false';
        span.dataset.narrativePath = block.narrativePath;
        span.textContent = block.narrativeText;
        el.appendChild(span);
      } else {
        renderParts(el, block.parts, forValueGraph);
      }
      return el;
    }
    if (block.type === 'item') {
      const el = document.createElement('p');
      el.className = 'editor-paragraph';

      const label = document.createElement('span');
      label.className = 'editor-label';
      renderParts(label, block.labelParts, forValueGraph);
      el.appendChild(label);
      el.appendChild(document.createTextNode(' '));

      if (block.prefixParts) {
        const prefix = document.createElement('span');
        prefix.className = 'editor-prefix';
        renderParts(prefix, block.prefixParts, forValueGraph);
        el.appendChild(prefix);
      }

      if (block.narrativePath) {
        const narrative = document.createElement('span');
        narrative.className = 'editor-narrative';
        narrative.contentEditable = isInteractive ? 'true' : 'false';
        narrative.dataset.narrativePath = block.narrativePath;
        narrative.textContent = block.narrativeText;
        el.appendChild(narrative);
      }

      if (block.trailingParts && block.trailingParts.length) {
        const trailing = document.createElement('span');
        trailing.className = 'editor-trailing';
        renderParts(trailing, block.trailingParts, forValueGraph);
        el.appendChild(trailing);
      }

      return el;
    }
    return document.createElement('span');
  }

  function renderCanvas() {
    const body = document.getElementById('editor-canvas-body');
    body.innerHTML = '';
    const blocks = LayoutBuilder.build(payload, templateType, valueGraph);
    blocks.forEach(b => body.appendChild(renderBlock(b, valueGraph, true)));
  }

  function renderSheetTabs() {
    const tabs = document.getElementById('editor-sheet-tabs');
    tabs.innerHTML = '';
    tabs.classList.toggle('hidden', sheets.length <= 1);
    sheets.forEach(sheet => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sheet-tab' + (sheet.name === activeSheetName ? ' active' : '');
      btn.textContent = sheet.name;
      btn.addEventListener('click', () => {
        activeSheetName = sheet.name;
        renderSheetTabs();
        renderSheetBody();
      });
      tabs.appendChild(btn);
    });
  }

  function renderSheetBody() {
    const body  = document.getElementById('editor-sheet-body');
    const sheet = sheets.find(s => s.name === activeSheetName) || sheets[0];
    if (!sheet) { body.innerHTML = '<p class="doc-preview-empty">No spreadsheet on this project yet.</p>'; return; }

    const table = document.createElement('table');
    sheet.aoa.forEach(rowCells => {
      const tr = document.createElement('tr');
      rowCells.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    body.innerHTML = '';
    body.appendChild(table);
    body.classList.toggle('picking', !!pickingLinkFor);
  }

  function renderInspector() {
    const panel = document.getElementById('editor-value-inspector');
    if (!selectedValueId || !valueGraph.nodes[selectedValueId]) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }

    const node = valueGraph.nodes[selectedValueId];
    panel.classList.remove('hidden');
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'inspector-title';
    title.textContent = `${humanizeId(selectedValueId)} — $${fmt(node.amount)} (${node.kind}${node.broken ? ', broken link' : ''})`;
    panel.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'inspector-actions';

    if (pickingFormulaFor === selectedValueId) {
      const hint = document.createElement('span');
      hint.className = 'inspector-hint';
      hint.textContent = `Click other values to add/remove them. Running total: $${fmt(formulaTermIds.reduce((s, id) => s + (valueGraph.nodes[id] ? valueGraph.nodes[id].amount : 0), 0))}`;
      actions.appendChild(hint);

      const done = document.createElement('button');
      done.className = 'btn btn-primary btn-sm';
      done.textContent = 'Done';
      done.addEventListener('click', () => {
        ValueGraph.setFormula(valueGraph, selectedValueId, formulaTermIds);
        ValueGraph.writeBack(payload, valueGraph);
        pickingFormulaFor = null;
        formulaTermIds = [];
        renderCanvas();
        renderInspector();
        persist();
      });
      actions.appendChild(done);
    } else if (pickingLinkFor === selectedValueId) {
      const hint = document.createElement('span');
      hint.className = 'inspector-hint';
      hint.textContent = 'Click a cell in the spreadsheet on the left to link this value.';
      actions.appendChild(hint);

      const cancel = document.createElement('button');
      cancel.className = 'btn btn-secondary btn-sm';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => {
        pickingLinkFor = null;
        renderSheetBody();
        renderInspector();
      });
      actions.appendChild(cancel);
    } else {
      if (node.kind === 'linked') {
        const unlink = document.createElement('button');
        unlink.className = 'btn btn-secondary btn-sm';
        unlink.textContent = 'Unlink';
        unlink.addEventListener('click', () => {
          ValueGraph.unlink(valueGraph, selectedValueId);
          ValueGraph.writeBack(payload, valueGraph);
          renderCanvas();
          renderInspector();
          persist();
        });
        actions.appendChild(unlink);
      } else {
        const link = document.createElement('button');
        link.className = 'btn btn-secondary btn-sm';
        link.textContent = 'Link to cell…';
        link.addEventListener('click', () => {
          pickingLinkFor = selectedValueId;
          renderSheetBody();
          renderInspector();
        });
        actions.appendChild(link);
      }

      const formula = document.createElement('button');
      formula.className = 'btn btn-secondary btn-sm';
      formula.textContent = 'Edit as calculated…';
      formula.addEventListener('click', () => {
        pickingFormulaFor = selectedValueId;
        formulaTermIds = node.kind === 'calculated' ? [...node.formula.termIds] : [];
        renderInspector();
      });
      actions.appendChild(formula);
    }

    const close = document.createElement('button');
    close.className = 'btn-icon';
    close.textContent = '×';
    close.addEventListener('click', () => {
      selectedValueId = null;
      pickingLinkFor = null;
      pickingFormulaFor = null;
      formulaTermIds = [];
      clearHighlights();
      renderSheetBody();
      renderInspector();
    });

    panel.appendChild(actions);
    panel.appendChild(close);
  }

  function clearHighlights() {
    document.getElementById('editor-canvas-body').classList.remove('dim-others');
    document.querySelectorAll('#editor-canvas-body .value-chip.chip-term-highlight').forEach(el => el.classList.remove('chip-term-highlight'));
    document.querySelectorAll('#editor-canvas-body .value-chip.chip-selected').forEach(el => el.classList.remove('chip-selected'));
    document.querySelectorAll('#editor-sheet-body td.cell-highlight').forEach(el => el.classList.remove('cell-highlight'));
  }

  function highlightSelection() {
    clearHighlights();
    const node = valueGraph.nodes[selectedValueId];
    if (!node) return;

    if (node.kind === 'linked' && node.link) {
      if (node.link.sheet !== activeSheetName) {
        activeSheetName = node.link.sheet;
        renderSheetTabs();
        renderSheetBody();
      }
      const table = document.querySelector('#editor-sheet-body table');
      const row   = table && table.rows[node.link.row];
      const td    = row && row.cells[node.link.col];
      if (td) {
        td.classList.add('cell-highlight');
        td.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      }
    } else if (node.kind === 'calculated') {
      const canvas = document.getElementById('editor-canvas-body');
      canvas.classList.add('dim-others');

      const ownChip = document.querySelector(`#editor-canvas-body .value-chip[data-value-id="${selectedValueId}"]`);
      if (ownChip) ownChip.classList.add('chip-selected');

      let first = null;
      node.formula.termIds.forEach(id => {
        const chip = document.querySelector(`#editor-canvas-body .value-chip[data-value-id="${id}"]`);
        if (!chip) return;
        chip.classList.add('chip-term-highlight');
        if (!first) first = chip;
      });
      if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function handleChipClick(e) {
    const chip = e.target.closest('.value-chip');
    if (!chip) return;
    const id = chip.dataset.valueId;

    if (pickingFormulaFor) {
      if (id === pickingFormulaFor) return;
      const idx = formulaTermIds.indexOf(id);
      if (idx === -1) formulaTermIds.push(id); else formulaTermIds.splice(idx, 1);
      renderInspector();
      return;
    }

    selectedValueId = id;
    renderInspector();
    highlightSelection();
  }

  function handleSheetClick(e) {
    if (!pickingLinkFor) return;
    const td = e.target.closest('td');
    if (!td || !td.parentElement) return;
    const row = td.parentElement.rowIndex;
    const col = td.cellIndex;
    const raw = td.textContent;
    const cleaned = String(raw).replace(/[$,]/g, '').trim();
    const value = parseFloat(cleaned);
    if (Number.isNaN(value)) return;

    ValueGraph.linkTo(valueGraph, pickingLinkFor, { sheet: activeSheetName, row, col, value });
    ValueGraph.writeBack(payload, valueGraph);
    pickingLinkFor = null;
    renderCanvas();
    renderSheetBody();
    renderInspector();
    persist();
  }

  function handleNarrativeBlur(e) {
    const el = e.target.closest('.editor-narrative');
    if (!el || !el.dataset.narrativePath) return;
    setPayloadPath(el.dataset.narrativePath, el.textContent);
    persist();
  }

  function setPayloadPath(path, value) {
    const parts = path.match(/[^.[\]]+/g) || [];
    let node = payload;
    for (let i = 0; i < parts.length - 1; i++) {
      node = node[/^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    node[/^\d+$/.test(lastKey) ? Number(lastKey) : lastKey] = value;
  }

  async function persist() {
    project.document = { payload, valueGraph, phase: project.document.phase, lastValidation: project.document.lastValidation };
    await ProjectPicker.persistActive();
  }

  async function handleReupload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const parsed = await Parser.parse(file);
    const result = ValueGraph.recoverBrokenLinks(valueGraph, parsed.sheets);
    ValueGraph.writeBack(payload, valueGraph);
    sheets = parsed.sheets;
    activeSheetName = sheets[0] ? sheets[0].name : null;
    project.spreadsheet = { fileName: file.name, fileBlob: file, csvText: parsed.csvText, sheets, uploadedAt: Date.now() };
    await persist();
    renderSheetTabs();
    renderSheetBody();
    renderCanvas();
    alert(`Spreadsheet updated. ${result.recovered} link(s) recovered automatically, ${result.stillBroken} link(s) need to be reconnected manually (shown in red).`);
  }

  async function handleExport() {
    await Document.generate(templateType, payload);
    project.document.phase = 'exported';
    await persist();
  }

  function close() {
    document.getElementById('editor-modal').classList.add('hidden');
  }

  function open(activeProject) {
    project      = activeProject;
    payload      = project.document.payload;
    valueGraph   = project.document.valueGraph;
    templateType = project.templateType;
    sheets       = (project.spreadsheet && project.spreadsheet.sheets) || [];
    activeSheetName = sheets[0] ? sheets[0].name : null;
    selectedValueId = null;
    pickingLinkFor = null;
    pickingFormulaFor = null;

    document.getElementById('editor-modal').classList.remove('hidden');
    renderSheetTabs();
    renderSheetBody();
    renderCanvas();
    renderInspector();
  }

  function openReadOnly(container, previewPayload, previewValueGraph, previewTemplateType) {
    container.innerHTML = '';
    const blocks = LayoutBuilder.build(previewPayload, previewTemplateType, previewValueGraph);
    blocks.forEach(b => container.appendChild(renderBlock(b, previewValueGraph, false)));
  }

  function init() {
    document.getElementById('editor-canvas-body').addEventListener('click', handleChipClick);
    document.getElementById('editor-canvas-body').addEventListener('blur', handleNarrativeBlur, true);
    document.getElementById('editor-sheet-body').addEventListener('click', handleSheetClick);
    document.getElementById('editor-close-btn').addEventListener('click', close);
    document.querySelector('#editor-modal .modal-overlay').addEventListener('click', close);
    document.getElementById('editor-export-btn').addEventListener('click', handleExport);
    document.getElementById('editor-reupload-input').addEventListener('change', handleReupload);

    document.addEventListener('project:opened', e => {
      const p = e.detail.project;
      const resumeBtn = document.getElementById('resume-editing-btn');
      if (!resumeBtn) return;
      const hasDraft = p.document && p.document.payload;
      resumeBtn.classList.toggle('hidden', !hasDraft);
      resumeBtn.onclick = () => open(p);
    });
  }

  return { init, open, openReadOnly };
})();
