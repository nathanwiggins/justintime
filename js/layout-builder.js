const LayoutBuilder = (() => {
  function t(text) { return { text }; }
  function chip(valueId) { return { valueId }; }

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function yearlyParts(basePath, breakdown) {
    if (!breakdown || !breakdown.length) return [];
    const parts = [t(' (')];
    breakdown.forEach((y, i) => {
      if (i > 0) parts.push(t(', '));
      parts.push(chip(`${basePath}.yearly_breakdown[${i}].cost`));
      parts.push(t(` in Year ${y.year}`));
    });
    parts.push(t(')'));
    return parts;
  }

  function effort(months, type) {
    const n = parseFloat(months);
    const unit = n === 1 ? 'month' : 'months';
    return type ? `${months} ${type} ${unit}` : `${months} ${unit}`;
  }

  function heading(text, valueId) {
    return { kind: 'heading', parts: [t(text + ' ($'), chip(valueId), t(')')] };
  }

  function subheading(text, valueId) {
    return { kind: 'subheading', parts: valueId ? [t(text + ' ($'), chip(valueId), t(')')] : [t(text)] };
  }

  function paragraph(parts) {
    return { kind: 'paragraph', parts };
  }

  function itemParts({ labelParts, prefixParts, narrativeText, trailingParts }) {
    return [
      ...labelParts,
      t(' '),
      ...(prefixParts || []),
      ...(narrativeText !== undefined ? [t(narrativeText || '')] : []),
      ...(trailingParts || [])
    ];
  }

  function yearMapOf(items) {
    const map = {};
    items.forEach(x => (x.yearly_breakdown || []).forEach(y => {
      map[y.year] = (map[y.year] || 0) + (y.cost || 0);
    }));
    return map;
  }

  function yearBreakdownStr(yearMap) {
    const years = Object.keys(yearMap).sort((a, b) => a - b);
    return years.map(yr => `$${fmt(yearMap[yr])} in Year ${yr}`).join(', ');
  }

  function rollupSentence(label, totalId, yearMap) {
    const str = yearBreakdownStr(yearMap);
    return paragraph([
      t(`The total request for ${label} is $`), chip(totalId),
      t(str ? ` (${str}).` : '.')
    ]);
  }

  function flyAmericaNote() {
    return paragraph([t('All requested international air travel will be booked in strict accordance with the Fly America Act (49 U.S.C. § 40118), utilizing U.S. flag air carriers or compliant Open Skies agreement partner airlines wherever applicable.')]);
  }

  function nsfEffortLimitNote(seniorPersonnel) {
    const overLimit = seniorPersonnel.filter(x => (x.effort_months_per_year || 0) > 2);
    if (!overLimit.length) return null;
    const roles = overLimit.map(x => x.role);
    const rolesStr = roles.length === 1 ? roles[0] : roles.slice(0, -1).join(', ') + ' and ' + roles[roles.length - 1];
    return paragraph([t(`Senior personnel are aware of NSF policy limiting NSF support for senior personnel to two months in any year. Since the ${rolesStr} will be fully engaged in efforts that holistically relate to this project throughout the year, we seek approval for ${overLimit.length === 1 ? 'this position' : 'these positions'} beyond the NSF two-month limitation.`)]);
  }

  function personBlock(x, i, key, totalField) {
    const basePath = `${key}[${i}]`;
    const totalId  = `${basePath}.${totalField}`;
    const displayName = x.name === x.role ? 'TBD' : x.name;
    return paragraph(itemParts({
      labelParts: [t(`${displayName}, ${x.role} (Effort: ${effort(x.effort_months_per_year, x.effort_type)}).`)],
      prefixParts: [t(`Funds are requested based on an Institutional Base Salary (IBS) of $${fmt(x.base_salary)}. `)],
      narrativeText: x.narrative_description || '',
      trailingParts: [
        t(` Total Requested Salary: $`), chip(totalId),
        ...yearlyParts(basePath, x.yearly_breakdown),
        t('.'),
        ...(x.escalation_note ? [t(' ' + x.escalation_note)] : [])
      ]
    }));
  }

  function otherPersonBlock(x, i) {
    const basePath = `other_personnel[${i}]`;
    const totalId  = `${basePath}.total_cost`;
    const count    = x.number_of_individuals || 0;
    const countStr = `${count} ${count === 1 ? 'individual' : 'individuals'}`;
    const rateText = x.rate_type === 'hourly' ? `${fmt(x.rate_amount)}/hour` : `${fmt(x.rate_amount)}/individual/year`;
    return paragraph(itemParts({
      labelParts: [t(`${x.role} (${countStr}, Effort: ${x.effort_description}).`)],
      prefixParts: [t(`Base rate: $${rateText}. `)],
      narrativeText: x.narrative_description || '',
      trailingParts: [
        t(` Total Requested: $`), chip(totalId),
        ...yearlyParts(basePath, x.yearly_breakdown),
        t('.'),
        ...(x.escalation_note ? [t(' ' + x.escalation_note)] : [])
      ]
    }));
  }

  function simpleItemBlock(x, basePath, nameField, narrativeField) {
    const totalId = `${basePath}.cost`;
    return paragraph(itemParts({
      labelParts: [t(`${x[nameField]} ($`), chip(totalId), t('):')],
      narrativeText: x[narrativeField] || '',
      trailingParts: yearlyParts(basePath, x.yearly_breakdown)
    }));
  }

  function travelBlock(x, basePath) {
    const totalId = `${basePath}.cost`;
    const breakdown = (x.cost_breakdown || []).map((c, ci) =>
      paragraph([t('$'), chip(`${basePath}.cost_breakdown[${ci}].amount`), t(` - ${c.component_name} (${c.formula})`)])
    );
    return [
      paragraph(itemParts({
        labelParts: [t(`${x.trip_purpose} ($`), chip(totalId), t('):')],
        narrativeText: x.narrative_justification || '',
        trailingParts: yearlyParts(basePath, x.yearly_breakdown)
      })),
      ...(breakdown.length ? [subheading(x.destination, null), ...breakdown] : [])
    ];
  }

  function participantBlock(label, x, basePath) {
    const totalId = `${basePath}.cost`;
    return paragraph(itemParts({
      labelParts: [t(`${label} ($`), chip(totalId), t('):')],
      narrativeText: x.justification || '',
      trailingParts: yearlyParts(basePath, x.yearly_breakdown)
    }));
  }

  function consultantBlock(x, i) {
    const basePath = `consultants[${i}]`;
    const totalId  = `${basePath}.cost`;
    return paragraph(itemParts({
      labelParts: [t(`${x.consultant_name} ($`), chip(totalId), t('):')],
      prefixParts: [t(`${x.consultant_name} will provide expertise in ${x.expertise_area} at a daily rate of $${fmt(x.rate)} for ${x.days} day${x.days === 1 ? '' : 's'}. `)],
      narrativeText: x.narrative_justification || '',
      trailingParts: yearlyParts(basePath, x.yearly_breakdown)
    }));
  }

  function subawardBlock(x, i) {
    const basePath = `subawards[${i}]`;
    const totalId  = `${basePath}.cost`;
    return paragraph(itemParts({
      labelParts: [t(`${x.institution_name} ($`), chip(totalId), t('):')],
      prefixParts: [t(`A separate budget and justification are attached for the subaward to ${x.institution_name} under the direction of ${x.sub_pi}. `)],
      narrativeText: x.narrative_justification || '',
      trailingParts: yearlyParts(basePath, x.yearly_breakdown)
    }));
  }

  function buildNsf(p, blocks) {
    const senior = p.senior_personnel || [];
    const other  = p.other_personnel  || [];

    blocks.push(heading('A. Senior Personnel', 'totals.personnel'));
    senior.forEach((x, i) => blocks.push(personBlock(x, i, 'senior_personnel', 'total_salary')));
    if (senior.length > 1) blocks.push(rollupSentence('Senior Personnel', 'totals.seniorPersonnel', yearMapOf(senior)));
    const limitNote = nsfEffortLimitNote(senior);
    if (limitNote) blocks.push(limitNote);

    blocks.push(heading('B. Other Personnel', 'totals.personnel'));
    other.forEach((x, i) => blocks.push(otherPersonBlock(x, i)));
    if (other.length > 1) blocks.push(rollupSentence('Other Personnel', 'totals.otherPersonnel', yearMapOf(other)));

    const fb = p.fringe_benefits || {};
    blocks.push(heading('C. Fringe Benefits', 'fringe_benefits.total_cost'));
    if (fb.narrative_description) blocks.push(paragraph([t(fb.narrative_description)]));
    (fb.rate_groups || []).forEach((g, i) => {
      const basePath = `fringe_benefits.rate_groups[${i}]`;
      blocks.push(paragraph(itemParts({
        labelParts: [t(`${g.personnel_category} (Rate: ${g.applied_rate_description}).`)],
        trailingParts: [t(' Category Total: $'), chip(`${basePath}.category_total`), ...yearlyParts(basePath, g.yearly_breakdown), t('.')]
      })));
    });
    if ((fb.rate_groups || []).length > 1) blocks.push(rollupSentence('Fringe Benefits', 'fringe_benefits.total_cost', yearMapOf(fb.rate_groups)));

    const domestic = p.domestic_travel || [];
    const foreign  = p.foreign_travel  || [];
    blocks.push(heading('E. Travel', 'totals.travel'));
    if (domestic.length) {
      domestic.forEach((x, i) => blocks.push(...travelBlock(x, `domestic_travel[${i}]`)));
      blocks.push(rollupSentence('Domestic Travel', 'totals.domesticTravel', yearMapOf(domestic)));
    }
    if (foreign.length) {
      foreign.forEach((x, i) => blocks.push(...travelBlock(x, `foreign_travel[${i}]`)));
      blocks.push(flyAmericaNote());
      blocks.push(rollupSentence('International Travel', 'totals.foreignTravel', yearMapOf(foreign)));
    }
    if (domestic.length && foreign.length) {
      const projectYrs = p.num_project_years || 0;
      const performanceStr = projectYrs ? `for the ${projectYrs}-year period of performance` : 'during the period of performance';
      const combinedStr = yearBreakdownStr(yearMapOf([...domestic, ...foreign]));
      blocks.push(paragraph([
        t('The total travel request is $'), chip('totals.travel'),
        t(` ${performanceStr}${combinedStr ? ` (${combinedStr})` : ''}.`)
      ]));
    }

    const equipment = p.equipment || [];
    blocks.push(heading('D. Equipment', 'totals.equipment'));
    equipment.forEach((x, i) => blocks.push(simpleItemBlock(x, `equipment[${i}]`, 'item_name', 'narrative_justification')));
    if (equipment.length > 1) blocks.push(rollupSentence('Equipment', 'totals.equipment', yearMapOf(equipment)));

    const psCategories = [
      { key: 'stipends', label: 'Stipends', items: p.stipends || [] },
      { key: 'participant_travel', label: 'Travel', items: p.participant_travel || [] },
      { key: 'subsistence', label: 'Subsistence', items: p.subsistence || [] },
      { key: 'participant_other', label: 'Other', items: p.participant_other || [] }
    ];
    const activeCategories = psCategories.filter(c => c.items.length > 0);
    blocks.push(heading('F. Participant Support Costs', 'totals.participantSupport'));
    if (p.participant_support_has_data) {
      activeCategories.forEach(({ key, label, items }) => items.forEach((x, i) => blocks.push(participantBlock(label, x, `${key}[${i}]`))));
      if (activeCategories.length > 1) blocks.push(rollupSentence('Participant Support', 'totals.participantSupport', yearMapOf(activeCategories.flatMap(c => c.items))));
    }

    const gSubsections = [
      p.materials_supplies || [], p.publications || [], p.consultants || [],
      p.computer_services || [], p.subawards || [], p.other_direct_lines || []
    ].filter(items => items.length > 0);

    blocks.push(heading('G. Other Direct Costs', 'totals.nsfOtherDirect'));
    (p.materials_supplies || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `materials_supplies[${i}]`, 'category_name', 'narrative_justification')));
    (p.publications || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `publications[${i}]`, 'publication_title_or_type', 'narrative_justification')));
    (p.consultants || []).forEach((x, i) => blocks.push(consultantBlock(x, i)));
    (p.computer_services || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `computer_services[${i}]`, 'service_description', 'narrative_justification')));
    (p.subawards || []).forEach((x, i) => blocks.push(subawardBlock(x, i)));
    (p.other_direct_lines || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `other_direct_lines[${i}]`, 'item_name', 'narrative_justification')));
    if (gSubsections.length > 1) blocks.push(rollupSentence('Other Direct Costs', 'totals.nsfOtherDirect', yearMapOf(gSubsections.flat())));

    const ic = p.indirect_costs || {};
    blocks.push(heading('I. Indirect Costs (Facilities and Administrative Costs)', 'indirect_costs.total_cost'));
    if (ic.narrative_description) blocks.push(paragraph([t(ic.narrative_description)]));

    blocks.push(heading('Total Costs', 'totals.grand'));
  }

  function buildGeneral(p, blocks) {
    const senior = p.senior_personnel || [];
    const other  = p.other_personnel  || [];

    blocks.push(heading('A. Personnel', 'totals.personnel'));
    senior.forEach((x, i) => blocks.push(personBlock(x, i, 'senior_personnel', 'total_salary')));
    other.forEach((x, i) => blocks.push(otherPersonBlock(x, i)));
    if (senior.length + other.length > 1) blocks.push(rollupSentence('Personnel', 'totals.personnel', yearMapOf([...senior, ...other])));

    const fb = p.fringe_benefits || {};
    blocks.push(heading('B. Fringe Benefits', 'fringe_benefits.total_cost'));
    if (fb.narrative_description) blocks.push(paragraph([t(fb.narrative_description)]));

    const domestic = p.domestic_travel || [];
    const foreign  = p.foreign_travel  || [];
    blocks.push(heading('C. Travel', 'totals.travel'));
    domestic.forEach((x, i) => blocks.push(...travelBlock(x, `domestic_travel[${i}]`)));
    foreign.forEach((x, i) => blocks.push(...travelBlock(x, `foreign_travel[${i}]`)));
    if (foreign.length) blocks.push(flyAmericaNote());
    if (domestic.length + foreign.length > 1) blocks.push(rollupSentence('Travel', 'totals.travel', yearMapOf([...domestic, ...foreign])));

    const equipment = p.equipment || [];
    blocks.push(heading('D. Equipment', 'totals.equipment'));
    equipment.forEach((x, i) => blocks.push(simpleItemBlock(x, `equipment[${i}]`, 'item_name', 'narrative_justification')));
    if (equipment.length > 1) blocks.push(rollupSentence('Equipment', 'totals.equipment', yearMapOf(equipment)));

    const supplies = p.materials_supplies || [];
    blocks.push(heading('E. Supplies', 'totals.supplies'));
    supplies.forEach((x, i) => blocks.push(simpleItemBlock(x, `materials_supplies[${i}]`, 'category_name', 'narrative_justification')));
    if (supplies.length > 1) blocks.push(rollupSentence('Supplies', 'totals.supplies', yearMapOf(supplies)));

    const consultants = p.consultants || [];
    const subawards    = p.subawards   || [];
    blocks.push(heading('F. Contractual', 'totals.contractual'));
    consultants.forEach((x, i) => blocks.push(consultantBlock(x, i)));
    subawards.forEach((x, i) => blocks.push(subawardBlock(x, i)));
    if (consultants.length + subawards.length > 1) blocks.push(rollupSentence('Contracts', 'totals.contractual', yearMapOf([...consultants, ...subawards])));

    const construction = p.construction_costs || [];
    blocks.push(heading('G. Construction', 'totals.construction'));
    construction.forEach((x, i) => blocks.push(simpleItemBlock(x, `construction_costs[${i}]`, 'category_name', 'narrative_justification')));
    if (construction.length > 1) blocks.push(rollupSentence('Construction', 'totals.construction', yearMapOf(construction)));

    const psCategories = [
      { key: 'stipends', label: 'Stipends', items: p.stipends || [] },
      { key: 'participant_travel', label: 'Travel', items: p.participant_travel || [] },
      { key: 'subsistence', label: 'Subsistence', items: p.subsistence || [] },
      { key: 'participant_other', label: 'Other', items: p.participant_other || [] }
    ];
    const activeCategories = psCategories.filter(c => c.items.length > 0);

    const hSubsections = [p.publications || [], p.computer_services || [], p.other_direct_lines || []]
      .filter(items => items.length > 0);

    blocks.push(heading('Participant Support Costs', 'totals.participantSupport'));
    if (p.participant_support_has_data && activeCategories.length > 0) {
      activeCategories.forEach(({ key, label, items }) => items.forEach((x, i) => blocks.push(participantBlock(label, x, `${key}[${i}]`))));
    }

    blocks.push(subheading('Other', 'totals.miscOther'));
    (p.publications || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `publications[${i}]`, 'publication_title_or_type', 'narrative_justification')));
    (p.computer_services || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `computer_services[${i}]`, 'service_description', 'narrative_justification')));
    (p.other_direct_lines || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `other_direct_lines[${i}]`, 'item_name', 'narrative_justification')));

    const hItemCount = activeCategories.flatMap(c => c.items).length + hSubsections.flat().length;
    if (hItemCount > 1) blocks.push(rollupSentence('Other', 'totals.generalOther', yearMapOf([...activeCategories.flatMap(c => c.items), ...hSubsections.flat()])));

    const ic = p.indirect_costs || {};
    blocks.push(heading('I. Indirect Costs (Facilities and Administrative Costs)', 'indirect_costs.total_cost'));
    if (ic.narrative_description) blocks.push(paragraph([t(ic.narrative_description)]));

    blocks.push(heading('J. Total Costs', 'totals.grand'));
    blocks.push(paragraph([t('The total budget request across all categories (A–I) is $'), chip('totals.grand'), t('.')]));
  }

  const BUILDERS = { nsf: buildNsf, general: buildGeneral };

  function build(payload, templateType) {
    const blocks = [
      { kind: 'title', parts: [t('BUDGET JUSTIFICATION')] },
      { kind: 'subtitle', parts: [t(payload.profile_name || '')] }
    ];
    (BUILDERS[templateType] || buildNsf)(payload, blocks);
    return blocks;
  }

  return { build };
})();
