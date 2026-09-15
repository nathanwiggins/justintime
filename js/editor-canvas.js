const EditorCanvas = (() => {
  let project    = null;
  let valueGraph = null;
  let blocks     = [];
  let templateType = null;
  let sheets     = [];
  let activeSheetName = null;

  let pickingLinkFor    = null;
  let pickingFormulaFor = null;
  let formulaTermIds    = [];
  let selectedValueId   = null;

  const BLOCK_TAGS    = { title: 'h2', subtitle: 'p', heading: 'h3', subheading: 'h4', paragraph: 'p' };
  const BLOCK_CLASSES = {
    title: 'editor-title', subtitle: 'editor-subtitle',
    heading: 'editor-heading', subheading: 'editor-subheading', paragraph: 'editor-paragraph'
  };

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function humanizeId(id) {
    if (id.startsWith('totals.')) return id.replace('totals.', '').replace(/([A-Z])/g, ' $1').trim();
    return id;
  }

  function colToLetters(col) {
    let letters = '';
    let n = col + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      letters = String.fromCharCode(65 + rem) + letters;
      n = Math.floor((n - 1) / 26);
    }
    return letters;
  }

  function cellRefA1(row, col) {
    return `${colToLetters(col)}${row + 1}`;
  }

  function chipsFor(id) {
    return Array.from(document.querySelectorAll(`#editor-canvas-body .value-chip[data-value-id="${id}"]`));
  }

  function inspectorLabel(node) {
    if (node.kind === 'linked' && node.link) return `[LINKED] ${node.link.sheet} | ${cellRefA1(node.link.row, node.link.col)}`;
    if (node.kind === 'calculated') {
      const n = node.formula.termIds.length;
      return `[CALCULATED] ${n} Value${n === 1 ? '' : 's'}`;
    }
    return humanizeId(selectedValueId);
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

  function renderBlock(block, index, forValueGraph, isInteractive) {
    const el = document.createElement(BLOCK_TAGS[block.kind] || 'p');
    el.className = BLOCK_CLASSES[block.kind] || 'editor-paragraph';
    if (index !== null) el.dataset.blockIndex = index;
    el.contentEditable = isInteractive ? 'true' : 'false';
    renderParts(el, block.parts, forValueGraph);
    return el;
  }

  function renderCanvas() {
    const body = document.getElementById('editor-canvas-body');
    body.innerHTML = '';
    blocks.forEach((b, i) => body.appendChild(renderBlock(b, i, valueGraph, true)));
    renderAuditBanner();
  }

  function unresolvedNodes() {
    return Object.values(valueGraph.nodes).filter(n => n.kind === 'plain');
  }

  function renderAuditBanner() {
    const existing = document.getElementById('editor-audit-banner');
    if (existing) existing.remove();

    const unresolved = unresolvedNodes();
    if (!unresolved.length) return;

    const banner = document.createElement('div');
    banner.id = 'editor-audit-banner';
    banner.className = 'editor-audit-banner';

    const summary = document.createElement('div');
    summary.className = 'editor-audit-summary';
    summary.textContent = `${unresolved.length} value${unresolved.length === 1 ? '' : 's'} couldn't be automatically matched to your spreadsheet. Click one below, then link it to a cell or mark it as calculated.`;
    banner.appendChild(summary);

    const list = document.createElement('div');
    list.className = 'editor-audit-list';
    unresolved.forEach(node => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'editor-audit-item';
      item.textContent = `$${fmt(node.amount)}`;
      item.addEventListener('click', () => {
        selectedValueId = node.id;
        renderInspector();
        highlightSelection();
        const [chip] = chipsFor(node.id);
        if (chip) chip.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      list.appendChild(item);
    });
    banner.appendChild(list);

    document.getElementById('editor-canvas-body').before(banner);
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

  async function renderDocsBody() {
    const body = document.getElementById('editor-docs-body');
    const summary = project.summary;
    if (!summary) { body.innerHTML = '<p class="doc-preview-empty">No project documentation on file for this project.</p>'; return; }

    if (summary.mode === 'file' && /\.docx$/i.test(summary.fileName || '')) {
      const html = await DocPreview.extractHtml(summary.fileBlob);
      DocPreview.render(body, html);
      return;
    }

    body.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'step-detail-pre';
    pre.textContent = summary.text || '';
    body.appendChild(pre);
  }

  function switchPreviewTab(view) {
    document.querySelectorAll('#editor-modal .preview-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    document.getElementById('editor-sheet-tabs').classList.toggle('hidden', view !== 'spreadsheet' || sheets.length <= 1);
    document.getElementById('editor-sheet-body').classList.toggle('hidden', view !== 'spreadsheet');
    document.getElementById('editor-docs-body').classList.toggle('hidden', view !== 'docs');
    if (view === 'docs') renderDocsBody();
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
    title.textContent = `${inspectorLabel(node)} — $${fmt(node.amount)}${node.broken ? ' (broken link)' : ''}`;
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
        pickingFormulaFor = null;
        formulaTermIds = [];
        renderCanvas();
        renderInspector();
        highlightSelection();
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
        clearHighlights();
        document.getElementById('editor-canvas-body').classList.add('dim-others');
        chipsFor(selectedValueId).forEach(chip => chip.classList.add('chip-selected'));
        formulaTermIds.forEach(id => {
          chipsFor(id).forEach(chip => chip.classList.add('chip-term-highlight'));
        });
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

      chipsFor(selectedValueId).forEach(chip => chip.classList.add('chip-selected'));

      let first = null;
      node.formula.termIds.forEach(id => {
        chipsFor(id).forEach(chip => {
          chip.classList.add('chip-term-highlight');
          if (!first) first = chip;
        });
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
      if (idx === -1) {
        formulaTermIds.push(id);
        chipsFor(id).forEach(c => c.classList.add('chip-term-highlight'));
      } else {
        formulaTermIds.splice(idx, 1);
        chipsFor(id).forEach(c => c.classList.remove('chip-term-highlight'));
      }
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
    pickingLinkFor = null;
    renderCanvas();
    renderSheetBody();
    renderInspector();
    persist();
  }

  function handleDocumentClick(e) {
    if (!selectedValueId || pickingLinkFor || pickingFormulaFor) return;
    if (e.target.closest('.value-chip')) return;
    if (e.target.closest('#editor-value-inspector')) return;
    selectedValueId = null;
    clearHighlights();
    renderInspector();
  }

  function serializeBlockParts(el) {
    const parts = [];
    function walk(node) {
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          if (child.nodeValue) parts.push({ text: child.nodeValue });
        } else if (child.classList && child.classList.contains('value-chip')) {
          parts.push({ valueId: child.dataset.valueId });
        } else {
          walk(child);
        }
      });
    }
    walk(el);
    return parts;
  }

  function handleBlockBlur(e) {
    const el = e.target.closest('[data-block-index]');
    if (!el || !document.getElementById('editor-canvas-body').contains(el)) return;
    const index = Number(el.dataset.blockIndex);
    if (!blocks[index]) return;
    blocks[index] = { kind: blocks[index].kind, parts: serializeBlockParts(el) };
    persist();
  }

  async function persist() {
    project.document = {
      payload: project.document.payload,
      blocks, valueGraph,
      phase: project.document.phase,
      lastValidation: project.document.lastValidation
    };
    await ProjectPicker.persistActive();
  }

  async function handleReupload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const parsed = await Parser.parse(file);
    const result = ValueGraph.recoverBrokenLinks(valueGraph, parsed.sheets);
    sheets = parsed.sheets;
    activeSheetName = sheets[0] ? sheets[0].name : null;
    project.spreadsheet = { fileName: file.name, fileBlob: file, csvText: parsed.csvText, sheets, uploadedAt: Date.now() };
    await persist();
    renderSheetTabs();
    renderSheetBody();
    renderCanvas();
    alert(`Spreadsheet updated. ${result.updated} linked value(s) picked up new numbers, ${result.recovered} link(s) recovered automatically, ${result.stillBroken} link(s) need to be reconnected manually (shown in red).`);
  }

  async function handleExport() {
    const unresolved = unresolvedNodes();
    if (unresolved.length) {
      const proceed = confirm(`${unresolved.length} value${unresolved.length === 1 ? '' : 's'} in this document couldn't be matched to your spreadsheet or marked as calculated. Export anyway?`);
      if (!proceed) return;
    }
    const { blob, fileName } = await Document.generate(templateType, blocks, valueGraph);
    project.exportedJustification = { fileName, fileBlob: new File([blob], fileName, { type: blob.type }), exportedAt: Date.now() };
    project.document.phase = 'exported';
    await persist();
  }

  function close() {
    document.getElementById('editor-modal').classList.add('hidden');
  }

  function open(activeProject) {
    project      = activeProject;
    if (!project.document.blocks) {
      project.document.blocks = LayoutBuilder.build(project.document.payload, project.templateType);
    }
    blocks       = project.document.blocks;
    valueGraph   = project.document.valueGraph;
    templateType = project.templateType;
    sheets       = (project.spreadsheet && project.spreadsheet.sheets) || [];
    activeSheetName = sheets[0] ? sheets[0].name : null;
    selectedValueId = null;
    pickingLinkFor = null;
    pickingFormulaFor = null;

    document.getElementById('editor-modal').classList.remove('hidden');
    switchPreviewTab('spreadsheet');
    renderSheetTabs();
    renderSheetBody();
    renderCanvas();
    renderInspector();
  }

  function openReadOnly(container, previewPayload, previewValueGraph, previewTemplateType) {
    container.innerHTML = '';
    const previewBlocks = LayoutBuilder.build(previewPayload, previewTemplateType);
    previewBlocks.forEach((b, i) => container.appendChild(renderBlock(b, null, previewValueGraph, false)));
  }

  function init() {
    document.getElementById('editor-canvas-body').addEventListener('click', handleChipClick);
    document.getElementById('editor-canvas-body').addEventListener('blur', handleBlockBlur, true);
    document.getElementById('editor-sheet-body').addEventListener('click', handleSheetClick);
    document.getElementById('editor-close-btn').addEventListener('click', close);
    document.querySelector('#editor-modal .modal-overlay').addEventListener('click', close);
    document.getElementById('editor-export-btn').addEventListener('click', handleExport);
    document.getElementById('editor-reupload-input').addEventListener('change', handleReupload);
    document.addEventListener('click', handleDocumentClick);

    document.querySelectorAll('#editor-modal .preview-tab').forEach(btn => {
      btn.addEventListener('click', () => switchPreviewTab(btn.dataset.view));
    });

    document.addEventListener('project:opened', e => {
      const p = e.detail.project;
      const resumeBtn = document.getElementById('resume-editing-btn');
      if (!resumeBtn) return;
      const hasDraft = p.document && (p.document.blocks || p.document.payload);
      resumeBtn.classList.toggle('hidden', !hasDraft);
      resumeBtn.onclick = () => open(p);
    });
  }

  return { init, open, openReadOnly };
})();
