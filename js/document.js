const Document = (() => {
  let _docx = null;

  async function requireDocx() {
    if (!_docx) _docx = await import('https://esm.sh/docx@8.5.0');
    return _docx;
  }

  const OUTPUT_FILENAMES = {
    'nsf':          'NSF_Budget_Justification.docx',
    'nih-detailed': 'NIH_Detailed_Budget_Justification.docx',
    'nih-modular':  'NIH_Modular_Budget_Justification.docx',
    'generic':      'Budget_Justification.docx'
  };

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function effort(months, type) {
    const n    = parseFloat(months);
    const unit = n === 1 ? 'month' : 'months';
    return type ? `${months} ${type} ${unit}` : `${months} ${unit}`;
  }

  function titleBlock(profileName) {
    const { Paragraph, TextRun, AlignmentType } = _docx;
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children:  [new TextRun({ text: 'BUDGET JUSTIFICATION', bold: true, allCaps: true, size: 28 })],
        spacing:   { after: 80 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children:  [new TextRun({ text: profileName || '', italics: true, size: 22 })],
        spacing:   { after: 240 }
      })
    ];
  }

  function sectionHeader(text) {
    const { Paragraph, TextRun } = _docx;
    return new Paragraph({
      children: [new TextRun({ text, bold: true, size: 26 })],
      spacing:  { before: 280, after: 120 }
    });
  }

  function subHeader(text) {
    const { Paragraph, TextRun } = _docx;
    return new Paragraph({
      children: [new TextRun({ text, bold: true, size: 24 })],
      spacing:  { before: 160, after: 80 }
    });
  }

  function lineItem(boldLabel, narrative) {
    const { Paragraph, TextRun } = _docx;
    return new Paragraph({
      children: [
        new TextRun({ text: boldLabel + ' ', bold: true }),
        new TextRun({ text: narrative || '' })
      ],
      spacing: { after: 100 }
    });
  }

  function plain(text) {
    const { Paragraph, TextRun } = _docx;
    return new Paragraph({
      children: [new TextRun({ text: text || '' })],
      spacing:  { after: 100 }
    });
  }

  function buildNsf(p) {
    const rows = [...titleBlock(p.profile_name)];

    const seniorPersonnel = p.senior_personnel || [];
    const seniorTotal = seniorPersonnel.reduce((sum, x) => sum + (x.total_salary || 0), 0);
    rows.push(sectionHeader(`A. Senior Personnel ($${fmt(seniorTotal)})`));
    seniorPersonnel.forEach(x => {
      const displayName = x.name === x.role ? 'TBD' : x.name;
      const yearlyStr = (x.yearly_breakdown || []).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
      rows.push(lineItem(
        `${displayName}, ${x.role} (Effort: ${effort(x.effort_months_per_year, x.effort_type)}).`,
        `Funds are requested based on an Institutional Base Salary (IBS) of $${fmt(x.base_salary)}. ${x.narrative_description} Total Requested Salary: $${fmt(x.total_salary)}${yearlyStr ? ` (${yearlyStr})` : ''}.`
      ));
    });

    if (seniorPersonnel.length > 1) {
      const yearMap = {};
      seniorPersonnel.forEach(x => {
        (x.yearly_breakdown || []).forEach(y => {
          yearMap[y.year] = (yearMap[y.year] || 0) + y.cost;
        });
      });
      const years       = Object.keys(yearMap).sort();
      const combinedStr = years.map(yr => `$${fmt(yearMap[yr])} in Year ${yr}`).join(', ');
      const { Paragraph, TextRun } = _docx;
      rows.push(new Paragraph({
        children: [
          new TextRun({ text: `The total request for Senior Personnel is ` }),
          new TextRun({ text: `$${fmt(seniorTotal)}`, bold: true }),
          new TextRun({ text: ` for the ${years.length}-year period of performance${combinedStr ? ` (${combinedStr})` : ''}.` })
        ],
        spacing: { after: 100 }
      }));
    }

    const overLimit = seniorPersonnel.filter(x => (x.effort_months_per_year || 0) > 2);
    if (overLimit.length > 0) {
      const roles    = overLimit.map(x => x.role);
      const rolesStr = roles.length === 1
        ? roles[0]
        : roles.slice(0, -1).join(', ') + ' and ' + roles[roles.length - 1];
      rows.push(plain(
        `Senior personnel are aware of NSF policy limiting NSF support for senior personnel to two months in any year. Since the ${rolesStr} will be fully engaged in efforts that holistically relate to this project throughout the year, we seek approval for ${overLimit.length === 1 ? 'this position' : 'these positions'} beyond the NSF two-month limitation.`
    ));
    }

    const otherPersonnel = p.other_personnel || [];
    const otherTotal = otherPersonnel.reduce((sum, x) => sum + (x.total_cost || 0), 0);
    rows.push(sectionHeader(`B. Other Personnel ($${fmt(otherTotal)})`));
    otherPersonnel.forEach(x => {
      const count             = x.number_of_individuals || 0;
      const countStr          = `${count} ${count === 1 ? 'individual' : 'individuals'}`;
      const formattedRateText = x.rate_type === 'hourly'
        ? `$${fmt(x.rate_amount)}/hour`
        : `$${fmt(x.rate_amount)}/individual/year`;
      const yearlyStr = (x.yearly_breakdown || []).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
      rows.push(lineItem(
        `${x.role} (${countStr}, Effort: ${x.effort_description}).`,
        `Base rate: ${formattedRateText}. ${x.narrative_description} Total Requested: $${fmt(x.total_cost)}${yearlyStr ? ` (${yearlyStr})` : ''}.`
      ));
    });

    if (otherPersonnel.length > 1) {
      const yearMap = {};
      otherPersonnel.forEach(x => {
        (x.yearly_breakdown || []).forEach(y => {
          yearMap[y.year] = (yearMap[y.year] || 0) + y.cost;
        });
      });
      const years       = Object.keys(yearMap).sort();
      const combinedStr = years.map(yr => `$${fmt(yearMap[yr])} in Year ${yr}`).join(', ');
      const { Paragraph, TextRun } = _docx;
      rows.push(new Paragraph({
        children: [
          new TextRun({ text: 'The total request for Other Personnel is ' }),
          new TextRun({ text: `$${fmt(otherTotal)}`, bold: true }),
          new TextRun({ text: ` for the ${years.length}-year period of performance${combinedStr ? ` (${combinedStr})` : ''}.` })
        ],
        spacing: { after: 100 }
      }));
    }

    const fb = p.fringe_benefits || {};
    rows.push(sectionHeader(`C. Fringe Benefits ($${fmt(fb.total_cost)})`));
    if (fb.narrative_description) rows.push(plain(fb.narrative_description));
    (fb.rate_groups || []).forEach(g => {
      const yearlyStr = (g.yearly_breakdown || []).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
      rows.push(lineItem(
        `${g.personnel_category} (Rate: ${g.applied_rate_description}).`,
        `Category Total: $${fmt(g.category_total)}${yearlyStr ? ` (${yearlyStr})` : ''}.`
      ));
    });

    if ((fb.rate_groups || []).length > 1) {
      const yearMap = {};
      (fb.rate_groups || []).forEach(g => {
        (g.yearly_breakdown || []).forEach(y => {
          yearMap[y.year] = (yearMap[y.year] || 0) + y.cost;
        });
      });
      const years       = Object.keys(yearMap).sort();
      const combinedStr = years.map(yr => `$${fmt(yearMap[yr])} in Year ${yr}`).join(', ');
      const { Paragraph, TextRun } = _docx;
      rows.push(new Paragraph({
        children: [
          new TextRun({ text: 'The total request for Fringe Benefits is ' }),
          new TextRun({ text: `$${fmt(fb.total_cost)}`, bold: true }),
          new TextRun({ text: ` for the ${years.length}-year period of performance${combinedStr ? ` (${combinedStr})` : ''}.` })
        ],
        spacing: { after: 100 }
      }));
    }

    rows.push(sectionHeader('D. Equipment'));
    if (!(p.equipment || []).length) {
      rows.push(plain('No items of equipment (defined as non-expendable equipment with an acquisition cost of $5,000 or more and a useful life of more than one year) are requested for this project.'));
    } else {
      p.equipment.forEach(x => rows.push(lineItem(
        `${x.item_name} ($${fmt(x.cost)}):`, x.narrative_justification
      )));
    }

    rows.push(sectionHeader('E. Travel'));
    rows.push(subHeader('E.1 Domestic Travel'));
    (p.domestic_travel || []).forEach(x => rows.push(lineItem(
      `${x.trip_purpose} ($${fmt(x.cost)}):`,
      `Funds are requested for travel to ${x.destination} for ${x.num_people} person(s) to attend ${x.event_name}. ${x.narrative_justification}`
    )));

    rows.push(subHeader('E.2 Foreign Travel'));
    (p.foreign_travel || []).forEach(x => rows.push(lineItem(
      `${x.trip_purpose} ($${fmt(x.cost)}):`,
      `Funds are requested for travel to ${x.destination} for ${x.num_people} person(s) to attend ${x.event_name}. ${x.narrative_justification}`
    )));

    rows.push(sectionHeader('F. Participant Support Costs'));
    if (!p.participant_support_has_data) {
      rows.push(plain('No participant support costs are requested for this project.'));
    } else {
      rows.push(subHeader('F.1 Stipends'));
      (p.stipends || []).forEach(x => rows.push(plain(`$${fmt(x.cost)} — ${x.justification}`)));
      rows.push(subHeader('F.2 Travel'));
      (p.participant_travel || []).forEach(x => rows.push(plain(`$${fmt(x.cost)} — ${x.justification}`)));
      rows.push(subHeader('F.3 Subsistence'));
      (p.subsistence || []).forEach(x => rows.push(plain(`$${fmt(x.cost)} — ${x.justification}`)));
      rows.push(subHeader('F.4 Other'));
      (p.participant_other || []).forEach(x => rows.push(plain(`$${fmt(x.cost)} — ${x.justification}`)));
    }

    rows.push(sectionHeader('G. Other Direct Costs'));
    rows.push(subHeader('G.1 Materials and Supplies'));
    (p.materials_supplies || []).forEach(x => rows.push(lineItem(
      `${x.category_name} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(subHeader('G.2 Publication Costs / Documentation / Dissemination'));
    (p.publications || []).forEach(x => rows.push(lineItem(
      `${x.publication_title_or_type} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(subHeader('G.3 Consultant Services'));
    (p.consultants || []).forEach(x => rows.push(lineItem(
      `${x.consultant_name} ($${fmt(x.cost)}):`,
      `Will provide expertise on ${x.expertise_area}. Rate is $${fmt(x.rate)}/day for ${x.days} days. ${x.narrative_justification}`
    )));

    rows.push(subHeader('G.4 Computer Services'));
    (p.computer_services || []).forEach(x => rows.push(lineItem(
      `${x.service_description} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(subHeader('G.5 Subawards'));
    (p.subawards || []).forEach(x => rows.push(lineItem(
      `${x.institution_name} ($${fmt(x.cost)}):`,
      `A separate budget and justification are attached for the subaward to ${x.institution_name} under the direction of ${x.sub_pi}. ${x.narrative_justification}`
    )));

    rows.push(subHeader('G.6 Other'));
    (p.other_direct_lines || []).forEach(x => rows.push(lineItem(
      `${x.item_name} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(sectionHeader('H. Indirect Costs (Facilities and Administrative Costs)'));
    rows.push(plain('Total Requested: $' + fmt(p.indirect_total_cost)));
    rows.push(plain(p.fa_boilerplate));

    return rows;
  }

  function buildNihDetailed(p) {
    const rows = [...titleBlock(p.profile_name)];

    rows.push(sectionHeader('A. Senior/Key Personnel'));
    (p.senior_personnel || []).forEach(x => rows.push(lineItem(
      `${x.name}, ${x.role} (Effort: ${effort(x.effort_months_per_year)}).`,
      `${x.name} will serve as ${x.role} and will be responsible for ${x.narrative_description}. Requested Salary: $${fmt(x.salary)}.`
    )));

    rows.push(sectionHeader('B. Other Personnel'));
    (p.other_personnel || []).forEach(x => rows.push(lineItem(
      `${x.name_or_title}, ${x.role} (Effort: ${effort(x.effort_months_per_year)}).`,
      `${x.narrative_description}. Requested Salary: $${fmt(x.salary)}.`
    )));

    rows.push(sectionHeader('C. Fringe Benefits'));
    rows.push(plain('Total Requested: $' + fmt(p.fringe_total_cost)));
    rows.push(plain(p.fringe_boilerplate));

    rows.push(sectionHeader('D. Equipment'));
    (p.equipment || []).forEach(x => rows.push(lineItem(
      `${x.item_name} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(sectionHeader('E. Travel'));
    (p.travel || []).forEach(x => rows.push(lineItem(
      `${x.travel_type} Travel ($${fmt(x.cost)}):`,
      `Funds are requested for ${x.num_people} project personnel to travel to ${x.destination} for the purpose of ${x.trip_purpose}. ${x.narrative_justification}`
    )));

    rows.push(sectionHeader('F. Participant/Trainee Support Costs'));
    (p.trainee_support || []).forEach(x => rows.push(lineItem(
      `${x.category} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(sectionHeader('G. Other Direct Costs'));
    rows.push(subHeader('G.1 Materials and Supplies'));
    (p.materials_supplies || []).forEach(x => rows.push(lineItem(
      `${x.category_name} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(subHeader('G.2 Publication Costs'));
    (p.publications || []).forEach(x => rows.push(lineItem(
      `${x.type} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(subHeader('G.3 Consultants'));
    (p.consultants || []).forEach(x => rows.push(lineItem(
      `${x.consultant_name} ($${fmt(x.cost)}):`,
      `Will assist with ${x.expertise_area}. ${x.narrative_justification}`
    )));

    rows.push(subHeader('G.4 Consortium/Contractual Costs'));
    (p.consortiums || []).forEach(x => rows.push(lineItem(
      `${x.institution_name} Subaward ($${fmt(x.total_cost)}):`,
      `Direct Costs: $${fmt(x.direct_costs)}; Indirect Costs: $${fmt(x.indirect_costs)}. A separate subaward budget and justification narrative are included for ${x.institution_name} under the direction of ${x.sub_pi}.`
    )));

    rows.push(subHeader('G.5 Equipment or Facility Rental/User Fees'));
    (p.user_fees || []).forEach(x => rows.push(lineItem(
      `${x.facility_name} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(subHeader('G.6 Alterations and Renovations'));
    (p.alterations || []).forEach(x => rows.push(lineItem(
      `${x.description} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(subHeader('G.7 Other'));
    (p.other_direct_lines || []).forEach(x => rows.push(lineItem(
      `${x.item_name} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(sectionHeader('H. Facilities and Administrative (F&A) Costs'));
    rows.push(plain('Total Requested: $' + fmt(p.indirect_total_cost)));
    rows.push(plain(p.fa_boilerplate));

    return rows;
  }

  function buildNihModular(p) {
    const rows = [...titleBlock(p.profile_name)];

    rows.push(sectionHeader('Personnel Justification'));
    (p.personnel || []).forEach(x => rows.push(lineItem(
      `${x.name}, ${x.role} (Effort: ${effort(x.effort_months_per_year, 'Calendar')}).`,
      `${x.name} will be responsible for ${x.narrative_description}. No salary or fringe benefit amounts are requested or explicitly stated in accordance with NIH Modular guidelines.`
    )));

    rows.push(sectionHeader('Consortium Justification'));
    if (!(p.consortium || []).length) {
      rows.push(plain('Not Applicable. No consortium or contractual arrangements are proposed.'));
    } else {
      p.consortium.forEach(x => rows.push(lineItem(
        `${x.institution_name} (${x.institution_location_type}).`,
        `This consortium subaward requires ${effort(x.effort_months_per_year, 'Calendar')} of effort for ${x.sub_personnel_name}, who will serve as ${x.sub_role} and oversee ${x.narrative_description}.`
      )));
    }

    rows.push(sectionHeader('Additional Narrative Justification'));
    if (!(p.additional_justification || []).length) {
      rows.push(plain('Not Applicable. An equal number of modules is requested for all budget periods.'));
    } else {
      p.additional_justification.forEach(x => rows.push(lineItem(
        'Yearly Module Variations:', x.variation_explanation
      )));
    }

    return rows;
  }

  function buildGeneric(p) {
    const rows = [...titleBlock(p.profile_name)];

    rows.push(sectionHeader('1. Personnel'));
    (p.personnel || []).forEach(x => rows.push(lineItem(
      `${x.name}, ${x.role} (${x.effort_months_per_year}):`,
      `${x.narrative_description} Total Salary Requested: $${fmt(x.salary)}.`
    )));

    rows.push(sectionHeader('2. Fringe Benefits'));
    rows.push(plain('Total Requested: $' + fmt(p.fringe_total_cost)));
    rows.push(plain(p.fringe_boilerplate));

    rows.push(sectionHeader('3. Equipment'));
    (p.equipment || []).forEach(x => rows.push(lineItem(
      `${x.item_name} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(sectionHeader('4. Travel'));
    (p.travel || []).forEach(x => rows.push(lineItem(
      `${x.destination} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(sectionHeader('5. Materials, Supplies, and Direct Operational Costs'));
    (p.direct_costs || []).forEach(x => rows.push(lineItem(
      `${x.category_or_item} ($${fmt(x.cost)}):`, x.narrative_justification
    )));

    rows.push(sectionHeader('6. Indirect Costs (Overhead / F&A)'));
    rows.push(plain('Total Requested: $' + fmt(p.indirect_total_cost)));
    rows.push(plain(p.fa_boilerplate));

    return rows;
  }

  const BUILDERS = {
    'nsf':          buildNsf,
    'nih-detailed': buildNihDetailed,
    'nih-modular':  buildNihModular,
    'generic':      buildGeneric
  };

  async function generate(templateType, payload) {
    const builder = BUILDERS[templateType];
    if (!builder) throw new Error(`Unknown template type: ${templateType}`);

    await requireDocx();
    const { Document: DocxDocument, Packer } = _docx;

    const doc = new DocxDocument({
      styles: {
        default: {
          document: {
            run: { font: 'Arial', size: 22 }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children: builder(payload)
      }]
    });
    const blob = await Packer.toBlob(doc);

    const url  = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href     = url;
    link.download = OUTPUT_FILENAMES[templateType];
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return { generate };
})();
