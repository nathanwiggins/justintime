const ValueGraph = (() => {
  const ARRAY_CATEGORIES = {
    senior_personnel:   'total_salary',
    other_personnel:    'total_cost',
    equipment:          'cost',
    domestic_travel:    'cost',
    foreign_travel:     'cost',
    materials_supplies: 'cost',
    construction_costs: 'cost',
    consultants:        'cost',
    subawards:          'cost',
    other_direct_lines: 'cost',
    stipends:           'cost',
    participant_travel: 'cost',
    subsistence:        'cost',
    participant_other:  'cost',
    publications:       'cost',
    computer_services:  'cost'
  };

  const GRAND_TERM_IDS = [
    'totals.personnel', 'fringe_benefits.total_cost', 'totals.travel', 'totals.equipment',
    'totals.supplies', 'totals.contractual', 'totals.construction',
    'totals.participantSupport', 'totals.miscOther', 'indirect_costs.total_cost'
  ];

  function cellMatches(cellText, value) {
    const cleaned = String(cellText).replace(/[$,]/g, '').trim();
    if (cleaned === '') return false;
    const num = parseFloat(cleaned);
    if (Number.isNaN(num)) return false;
    const diff = Math.abs(num - value);
    return diff <= 1 || diff / Math.max(Math.abs(num), Math.abs(value), 1) <= 0.01;
  }

  function findCell(sheets, amount) {
    if (amount === undefined || amount === null) return null;
    for (const sheet of sheets || []) {
      for (let row = 0; row < sheet.aoa.length; row++) {
        const cells = sheet.aoa[row];
        for (let col = 0; col < cells.length; col++) {
          if (cellMatches(cells[col], amount)) {
            return { sheet: sheet.name, row, col, lastKnownValue: amount };
          }
        }
      }
    }
    return null;
  }

  function leafNode(id, amount, sheets) {
    const link = findCell(sheets, amount);
    return link
      ? { id, kind: 'linked', amount, link, formula: null, broken: false }
      : { id, kind: 'plain', amount, link: null, formula: null, broken: false };
  }

  function sumNode(id, amount, termIds) {
    return { id, kind: 'calculated', amount, link: null, formula: { termIds }, broken: false };
  }

  function classifyYearly(item, basePath, nodes, sheets) {
    return (item.yearly_breakdown || []).map((y, i) => {
      const id = `${basePath}.yearly_breakdown[${i}].cost`;
      nodes[id] = leafNode(id, y.cost || 0, sheets);
      return id;
    });
  }

  function classifyTotalField(item, basePath, totalField, nodes, sheets) {
    const totalId = `${basePath}.${totalField}`;
    if (item.yearly_breakdown && item.yearly_breakdown.length) {
      const termIds = classifyYearly(item, basePath, nodes, sheets);
      nodes[totalId] = sumNode(totalId, item[totalField] || 0, termIds);
    } else {
      nodes[totalId] = leafNode(totalId, item[totalField] || 0, sheets);
    }
    return totalId;
  }

  function classifyArrayCategory(payload, key, totalField, nodes, sheets) {
    const items = payload[key] || [];
    return items.map((item, i) => {
      const basePath = `${key}[${i}]`;

      if (item.cost_breakdown && item.cost_breakdown.length) {
        item.cost_breakdown.forEach((c, ci) => {
          const id = `${basePath}.cost_breakdown[${ci}].amount`;
          nodes[id] = leafNode(id, c.amount || 0, sheets);
        });
      }

      return classifyTotalField(item, basePath, totalField, nodes, sheets);
    });
  }

  function classifyFringe(payload, nodes, sheets) {
    const fb = payload.fringe_benefits;
    if (!fb) return;

    if (fb.rate_groups && fb.rate_groups.length) {
      const groupIds = fb.rate_groups.map((g, i) =>
        classifyTotalField(g, `fringe_benefits.rate_groups[${i}]`, 'category_total', nodes, sheets)
      );
      nodes['fringe_benefits.total_cost'] = sumNode('fringe_benefits.total_cost', fb.total_cost || 0, groupIds);
    } else {
      classifyTotalField(fb, 'fringe_benefits', 'total_cost', nodes, sheets);
    }
  }

  function classifyIndirect(payload, nodes, sheets) {
    const ic = payload.indirect_costs;
    if (!ic) return;
    classifyTotalField(ic, 'indirect_costs', 'total_cost', nodes, sheets);
  }

  function sumOf(nodes, ids) {
    return ids.reduce((sum, id) => sum + (nodes[id] ? nodes[id].amount : 0), 0);
  }

  function build(payload, templateType, sheets) {
    const nodes = {};
    const categoryIds = {};

    Object.keys(ARRAY_CATEGORIES).forEach(key => {
      categoryIds[key] = classifyArrayCategory(payload, key, ARRAY_CATEGORIES[key], nodes, sheets);
    });

    classifyFringe(payload, nodes, sheets);
    classifyIndirect(payload, nodes, sheets);

    const personnelIds = [...categoryIds.senior_personnel, ...categoryIds.other_personnel];
    nodes['totals.personnel'] = sumNode('totals.personnel', sumOf(nodes, personnelIds), personnelIds);

    const travelIds = [...categoryIds.domestic_travel, ...categoryIds.foreign_travel];
    nodes['totals.travel'] = sumNode('totals.travel', sumOf(nodes, travelIds), travelIds);

    nodes['totals.equipment'] = sumNode('totals.equipment', sumOf(nodes, categoryIds.equipment), categoryIds.equipment);
    nodes['totals.supplies']  = sumNode('totals.supplies', sumOf(nodes, categoryIds.materials_supplies), categoryIds.materials_supplies);

    const contractualIds = [...categoryIds.consultants, ...categoryIds.subawards];
    nodes['totals.contractual'] = sumNode('totals.contractual', sumOf(nodes, contractualIds), contractualIds);

    nodes['totals.construction'] = sumNode('totals.construction', sumOf(nodes, categoryIds.construction_costs), categoryIds.construction_costs);

    const psIds = [...categoryIds.stipends, ...categoryIds.participant_travel, ...categoryIds.subsistence, ...categoryIds.participant_other];
    nodes['totals.participantSupport'] = sumNode('totals.participantSupport', sumOf(nodes, psIds), psIds);

    const miscIds = [...categoryIds.publications, ...categoryIds.computer_services, ...categoryIds.other_direct_lines];
    nodes['totals.miscOther'] = sumNode('totals.miscOther', sumOf(nodes, miscIds), miscIds);

    nodes['totals.grand'] = sumNode('totals.grand', sumOf(nodes, GRAND_TERM_IDS), GRAND_TERM_IDS);

    return { templateType, nodes };
  }

  function recompute(valueGraph) {
    let changed = true;
    while (changed) {
      changed = false;
      Object.values(valueGraph.nodes).forEach(node => {
        if (node.kind !== 'calculated') return;
        const amount = sumOf(valueGraph.nodes, node.formula.termIds);
        if (amount !== node.amount) { node.amount = amount; changed = true; }
      });
    }
  }

  function recoverBrokenLinks(valueGraph, newSheets) {
    const cellAt = (sheetName, row, col) => {
      const sheet = newSheets.find(s => s.name === sheetName);
      return sheet && sheet.aoa[row] ? sheet.aoa[row][col] : undefined;
    };

    const linked = Object.values(valueGraph.nodes).filter(n => n.kind === 'linked');
    const broken  = linked.filter(n => {
      const cell = cellAt(n.link.sheet, n.link.row, n.link.col);
      return cell === undefined || !cellMatches(cell, n.link.lastKnownValue);
    });
    if (!broken.length) return { recovered: 0, stillBroken: 0 };

    let bestOffset = null;
    let bestCount  = 0;
    for (let offset = -5; offset <= 5; offset++) {
      if (offset === 0) continue;
      const count = broken.filter(n => {
        const cell = cellAt(n.link.sheet, n.link.row + offset, n.link.col);
        return cell !== undefined && cellMatches(cell, n.link.lastKnownValue);
      }).length;
      if (count > bestCount) { bestCount = count; bestOffset = offset; }
    }

    let recovered = 0;
    broken.forEach(n => {
      const cell = bestOffset !== null ? cellAt(n.link.sheet, n.link.row + bestOffset, n.link.col) : undefined;
      if (bestOffset !== null && cell !== undefined && cellMatches(cell, n.link.lastKnownValue)) {
        n.link.row = n.link.row + bestOffset;
        n.broken   = false;
        recovered++;
      } else {
        n.broken = true;
      }
    });

    recompute(valueGraph);
    return { recovered, stillBroken: broken.length - recovered };
  }

  function setPath(payload, path, value) {
    const parts = path.match(/[^.[\]]+/g) || [];
    let node = payload;
    for (let i = 0; i < parts.length - 1; i++) {
      node = node[/^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    node[/^\d+$/.test(lastKey) ? Number(lastKey) : lastKey] = value;
  }

  function writeBack(payload, valueGraph) {
    Object.values(valueGraph.nodes).forEach(node => {
      if (node.id.startsWith('totals.')) return;
      setPath(payload, node.id, node.amount);
    });
  }

  function linkTo(valueGraph, id, cellRef) {
    const node = valueGraph.nodes[id];
    if (!node) return;
    node.kind   = 'linked';
    node.amount = cellRef.value;
    node.link   = { sheet: cellRef.sheet, row: cellRef.row, col: cellRef.col, lastKnownValue: cellRef.value };
    node.formula = null;
    node.broken  = false;
    recompute(valueGraph);
  }

  function unlink(valueGraph, id) {
    const node = valueGraph.nodes[id];
    if (!node) return;
    node.kind    = 'plain';
    node.link    = null;
    node.formula = null;
    node.broken  = false;
    recompute(valueGraph);
  }

  function setFormula(valueGraph, id, termIds) {
    const node = valueGraph.nodes[id];
    if (!node) return;
    node.kind    = 'calculated';
    node.link    = null;
    node.broken  = false;
    node.formula = { termIds };
    node.amount  = sumOf(valueGraph.nodes, termIds);
    recompute(valueGraph);
  }

  return {
    build, recompute, recoverBrokenLinks, writeBack,
    linkTo, unlink, setFormula, cellMatches, findCell
  };
})();
