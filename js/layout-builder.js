const LayoutBuilder = (() => {
  function t(text) { return { text }; }
  function chip(valueId) { return { valueId }; }

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function amountOf(valueGraph, id) {
    const node = valueGraph.nodes[id];
    return node ? node.amount : 0;
  }

  function yearlyParts(basePath, breakdown, valueGraph) {
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
    return { type: 'heading', parts: [t(text + ' ($'), chip(valueId), t(')')] };
  }

  function subheading(text, valueId) {
    return { type: 'subheading', parts: valueId ? [t(text + ' ($'), chip(valueId), t(')')] : [t(text)] };
  }

  function personBlock(x, i, key, totalField, valueGraph) {
    const basePath = `${key}[${i}]`;
    const totalId  = `${basePath}.${totalField}`;
    const displayName = x.name === x.role ? 'TBD' : x.name;
    return {
      type: 'item',
      labelParts: [t(`${displayName}, ${x.role} (Effort: ${effort(x.effort_months_per_year, x.effort_type)}).`)],
      narrativePath: `${basePath}.narrative_description`,
      narrativeText: x.narrative_description || '',
      trailingParts: [
        t(` Total Requested Salary: $`), chip(totalId),
        ...yearlyParts(basePath, x.yearly_breakdown, valueGraph),
        t('.'),
        ...(x.escalation_note ? [t(' ' + x.escalation_note)] : [])
      ],
      prefixParts: [t(`Funds are requested based on an Institutional Base Salary (IBS) of $${fmt(x.base_salary)}. `)]
    };
  }

  function otherPersonBlock(x, i, valueGraph) {
    const basePath = `other_personnel[${i}]`;
    const totalId  = `${basePath}.total_cost`;
    const count    = x.number_of_individuals || 0;
    const countStr = `${count} ${count === 1 ? 'individual' : 'individuals'}`;
    const rateText = x.rate_type === 'hourly' ? `${fmt(x.rate_amount)}/hour` : `${fmt(x.rate_amount)}/individual/year`;
    return {
      type: 'item',
      labelParts: [t(`${x.role} (${countStr}, Effort: ${x.effort_description}).`)],
      narrativePath: `${basePath}.narrative_description`,
      narrativeText: x.narrative_description || '',
      trailingParts: [
        t(` Total Requested: $`), chip(totalId),
        ...yearlyParts(basePath, x.yearly_breakdown, valueGraph),
        t('.'),
        ...(x.escalation_note ? [t(' ' + x.escalation_note)] : [])
      ],
      prefixParts: [t(`Base rate: $${rateText}. `)]
    };
  }

  function simpleItemBlock(x, basePath, nameField, narrativeField, valueGraph) {
    const totalId = `${basePath}.cost`;
    return {
      type: 'item',
      labelParts: [t(`${x[nameField]} ($`), chip(totalId), t('):')],
      narrativePath: `${basePath}.${narrativeField}`,
      narrativeText: x[narrativeField] || '',
      trailingParts: yearlyParts(basePath, x.yearly_breakdown, valueGraph)
    };
  }

  function travelBlock(x, basePath, valueGraph) {
    const totalId = `${basePath}.cost`;
    const breakdown = (x.cost_breakdown || []).map((c, ci) => ({
      type: 'text',
      parts: [t('$'), chip(`${basePath}.cost_breakdown[${ci}].amount`), t(` - ${c.component_name} (${c.formula})`)]
    }));
    return [
      {
        type: 'item',
        labelParts: [t(`${x.trip_purpose} ($`), chip(totalId), t('):')],
        narrativePath: `${basePath}.narrative_justification`,
        narrativeText: x.narrative_justification || '',
        trailingParts: yearlyParts(basePath, x.yearly_breakdown, valueGraph)
      },
      ...(breakdown.length ? [subheading(x.destination, null), ...breakdown] : [])
    ];
  }

  function participantBlock(label, x, basePath, valueGraph) {
    const totalId = `${basePath}.cost`;
    return {
      type: 'item',
      labelParts: [t(`${label} ($`), chip(totalId), t('):')],
      narrativePath: `${basePath}.justification`,
      narrativeText: x.justification || '',
      trailingParts: yearlyParts(basePath, x.yearly_breakdown, valueGraph)
    };
  }

  function consultantBlock(x, i, valueGraph) {
    const basePath = `consultants[${i}]`;
    const totalId  = `${basePath}.cost`;
    return {
      type: 'item',
      labelParts: [t(`${x.consultant_name} ($`), chip(totalId), t('):')],
      narrativePath: `${basePath}.narrative_justification`,
      narrativeText: x.narrative_justification || '',
      trailingParts: yearlyParts(basePath, x.yearly_breakdown, valueGraph),
      prefixParts: [t(`${x.consultant_name} will provide expertise in ${x.expertise_area} at a daily rate of $${fmt(x.rate)} for ${x.days} day${x.days === 1 ? '' : 's'}. `)]
    };
  }

  function subawardBlock(x, i, valueGraph) {
    const basePath = `subawards[${i}]`;
    const totalId  = `${basePath}.cost`;
    return {
      type: 'item',
      labelParts: [t(`${x.institution_name} ($`), chip(totalId), t('):')],
      narrativePath: `${basePath}.narrative_justification`,
      narrativeText: x.narrative_justification || '',
      trailingParts: yearlyParts(basePath, x.yearly_breakdown, valueGraph),
      prefixParts: [t(`A separate budget and justification are attached for the subaward to ${x.institution_name} under the direction of ${x.sub_pi}. `)]
    };
  }

  function build(payload, templateType, valueGraph) {
    const p = payload;
    const blocks = [
      { type: 'title', text: 'BUDGET JUSTIFICATION' },
      { type: 'subtitle', text: p.profile_name || '' }
    ];

    blocks.push(heading(templateType === 'nsf' ? 'A. Senior Personnel' : 'A. Personnel', 'totals.personnel'));
    (p.senior_personnel || []).forEach((x, i) => blocks.push(personBlock(x, i, 'senior_personnel', 'total_salary', valueGraph)));

    if (templateType === 'nsf') {
      blocks.push(heading('B. Other Personnel', 'totals.personnel'));
    }
    (p.other_personnel || []).forEach((x, i) => blocks.push(otherPersonBlock(x, i, valueGraph)));

    const fb = p.fringe_benefits || {};
    blocks.push(heading(templateType === 'nsf' ? 'C. Fringe Benefits' : 'B. Fringe Benefits', 'fringe_benefits.total_cost'));
    if (fb.narrative_description) {
      blocks.push({ type: 'text', parts: [t(fb.narrative_description)], narrativePath: 'fringe_benefits.narrative_description', narrativeText: fb.narrative_description });
    }
    (fb.rate_groups || []).forEach((g, i) => {
      const basePath = `fringe_benefits.rate_groups[${i}]`;
      blocks.push({
        type: 'item',
        labelParts: [t(`${g.personnel_category} (Rate: ${g.applied_rate_description}).`)],
        narrativePath: null,
        narrativeText: '',
        trailingParts: [t(' Category Total: $'), chip(`${basePath}.category_total`), ...yearlyParts(basePath, g.yearly_breakdown, valueGraph), t('.')]
      });
    });

    blocks.push(heading(templateType === 'nsf' ? 'E. Travel' : 'C. Travel', 'totals.travel'));
    (p.domestic_travel || []).forEach((x, i) => blocks.push(...travelBlock(x, `domestic_travel[${i}]`, valueGraph)));
    (p.foreign_travel || []).forEach((x, i) => blocks.push(...travelBlock(x, `foreign_travel[${i}]`, valueGraph)));

    blocks.push(heading('D. Equipment', 'totals.equipment'));
    (p.equipment || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `equipment[${i}]`, 'item_name', 'narrative_justification', valueGraph)));

    if (templateType === 'general') {
      blocks.push(heading('E. Supplies', 'totals.supplies'));
      (p.materials_supplies || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `materials_supplies[${i}]`, 'category_name', 'narrative_justification', valueGraph)));

      blocks.push(heading('F. Contractual', 'totals.contractual'));
      (p.consultants || []).forEach((x, i) => blocks.push(consultantBlock(x, i, valueGraph)));
      (p.subawards || []).forEach((x, i) => blocks.push(subawardBlock(x, i, valueGraph)));

      blocks.push(heading('G. Construction', 'totals.construction'));
      (p.construction_costs || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `construction_costs[${i}]`, 'category_name', 'narrative_justification', valueGraph)));
    }

    const psLabel = templateType === 'nsf' ? 'F. Participant Support Costs' : 'Participant Support Costs';
    if (templateType === 'nsf') blocks.push(heading(psLabel, 'totals.participantSupport'));
    else blocks.push(subheading(psLabel, 'totals.participantSupport'));

    (p.stipends || []).forEach((x, i) => blocks.push(participantBlock('Stipends', x, `stipends[${i}]`, valueGraph)));
    (p.participant_travel || []).forEach((x, i) => blocks.push(participantBlock('Travel', x, `participant_travel[${i}]`, valueGraph)));
    (p.subsistence || []).forEach((x, i) => blocks.push(participantBlock('Subsistence', x, `subsistence[${i}]`, valueGraph)));
    (p.participant_other || []).forEach((x, i) => blocks.push(participantBlock('Other', x, `participant_other[${i}]`, valueGraph)));

    if (templateType === 'nsf') {
      blocks.push(heading('G. Other Direct Costs', 'totals.miscOther'));
      (p.materials_supplies || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `materials_supplies[${i}]`, 'category_name', 'narrative_justification', valueGraph)));
      (p.publications || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `publications[${i}]`, 'publication_title_or_type', 'narrative_justification', valueGraph)));
      (p.consultants || []).forEach((x, i) => blocks.push(consultantBlock(x, i, valueGraph)));
      (p.computer_services || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `computer_services[${i}]`, 'service_description', 'narrative_justification', valueGraph)));
      (p.subawards || []).forEach((x, i) => blocks.push(subawardBlock(x, i, valueGraph)));
      (p.other_direct_lines || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `other_direct_lines[${i}]`, 'item_name', 'narrative_justification', valueGraph)));
    } else {
      blocks.push(subheading('Other', 'totals.miscOther'));
      (p.publications || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `publications[${i}]`, 'publication_title_or_type', 'narrative_justification', valueGraph)));
      (p.computer_services || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `computer_services[${i}]`, 'service_description', 'narrative_justification', valueGraph)));
      (p.other_direct_lines || []).forEach((x, i) => blocks.push(simpleItemBlock(x, `other_direct_lines[${i}]`, 'item_name', 'narrative_justification', valueGraph)));
    }

    const ic = p.indirect_costs || {};
    blocks.push(heading('I. Indirect Costs (Facilities and Administrative Costs)', 'indirect_costs.total_cost'));
    if (ic.narrative_description) {
      blocks.push({ type: 'text', parts: [t(ic.narrative_description)], narrativePath: 'indirect_costs.narrative_description', narrativeText: ic.narrative_description });
    }

    blocks.push(heading(templateType === 'nsf' ? 'Total Costs' : 'J. Total Costs', 'totals.grand'));

    return blocks;
  }

  return { build };
})();
