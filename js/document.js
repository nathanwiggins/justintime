const Document = (() => {
  let _docx = null;

  async function requireDocx() {
    if (!_docx) _docx = await import('https://esm.sh/docx@8.5.0');
    return _docx;
  }

  const OUTPUT_FILENAMES = {
    'nsf':          'NSF_Budget_Justification.docx',
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

  function italic(text) {
    const { Paragraph, TextRun } = _docx;
    return new Paragraph({
      children: [new TextRun({ text: text || '', italics: true })],
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
      const yearlyStr   = (x.yearly_breakdown || []).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
      const boldLabel   = `${displayName}, ${x.role} (Effort: ${effort(x.effort_months_per_year, x.effort_type)}).`;
      const narrative   = `Funds are requested based on an Institutional Base Salary (IBS) of $${fmt(x.base_salary)}. ${x.narrative_description} Total Requested Salary: $${fmt(x.total_salary)}${yearlyStr ? ` (${yearlyStr})` : ''}.`;
      if (x.escalation_note) {
        const { Paragraph, TextRun } = _docx;
        rows.push(new Paragraph({
          children: [
            new TextRun({ text: boldLabel + ' ', bold: true }),
            new TextRun({ text: narrative }),
            new TextRun({ text: ' ' + x.escalation_note, italics: true })
          ],
          spacing: { after: 100 }
        }));
      } else {
        rows.push(lineItem(boldLabel, narrative));
      }
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
      const yearlyStr  = (x.yearly_breakdown || []).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
      const boldLabel  = `${x.role} (${countStr}, Effort: ${x.effort_description}).`;
      const narrative  = `Base rate: ${formattedRateText}. ${x.narrative_description} Total Requested: $${fmt(x.total_cost)}${yearlyStr ? ` (${yearlyStr})` : ''}.`;
      if (x.escalation_note) {
        const { Paragraph, TextRun } = _docx;
        rows.push(new Paragraph({
          children: [
            new TextRun({ text: boldLabel + ' ', bold: true }),
            new TextRun({ text: narrative }),
            new TextRun({ text: ' ' + x.escalation_note, italics: true })
          ],
          spacing: { after: 100 }
        }));
      } else {
        rows.push(lineItem(boldLabel, narrative));
      }
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

    const equipmentTotal = (p.equipment || []).reduce((sum, x) => sum + (x.cost || 0), 0);
    rows.push(sectionHeader(`D. Equipment ($${fmt(equipmentTotal)})`));
    if ((p.equipment || []).length) {
      p.equipment.forEach(x => rows.push(lineItem(
        `${x.item_name} ($${fmt(x.cost)}):`, x.narrative_justification
      )));

      if (p.equipment.length > 1) {
        const itemsStr    = p.equipment.map(x => `$${fmt(x.cost)} for ${x.item_name}`).join(', ');
        const { Paragraph, TextRun } = _docx;
        rows.push(new Paragraph({
          children: [
            new TextRun({ text: 'The total request for Equipment is ' }),
            new TextRun({ text: `$${fmt(equipmentTotal)}`, bold: true }),
            new TextRun({ text: ` (${itemsStr}).` })
          ],
          spacing: { after: 100 }
        }));
      }
    }

    const domestic      = p.domestic_travel || [];
    const foreign       = p.foreign_travel  || [];
    const domesticTotal = domestic.reduce((s, x) => s + (x.cost || 0), 0);
    const foreignTotal  = foreign.reduce((s, x)  => s + (x.cost || 0), 0);
    const travelTotal   = domesticTotal + foreignTotal;

    rows.push(sectionHeader(`E. Travel ($${fmt(travelTotal)})`));

    function travelYearMap(trips) {
      const map = {};
      trips.forEach(x => (x.yearly_breakdown || []).forEach(y => {
        map[y.year] = (map[y.year] || 0) + y.cost;
      }));
      return map;
    }

    function travelSummaryRow(label, total, yearMap) {
      const years       = Object.keys(yearMap).sort();
      const combinedStr = years.map(yr => `$${fmt(yearMap[yr])} in Year ${yr}`).join(', ');
      const { Paragraph, TextRun } = _docx;
      return new Paragraph({
        children: [
          new TextRun({ text: `Total ${label}: ` }),
          new TextRun({ text: `$${fmt(total)}`, bold: true }),
          new TextRun({ text: combinedStr ? ` (${combinedStr}).` : '.' })
        ],
        spacing: { after: 100 }
      });
    }

    function maxProjectYear(payload) {
      let max = 0;
      function scan(node) {
        if (Array.isArray(node)) { node.forEach(scan); }
        else if (node && typeof node === 'object') {
          if ('year' in node && typeof node.year === 'number') max = Math.max(max, node.year);
          else Object.values(node).forEach(scan);
        }
      }
      scan(payload);
      return max;
    }

    if (domestic.length) {
      domestic.forEach(x => {
        const yearlyStr = (x.yearly_breakdown || []).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
        rows.push(lineItem(
          `${x.trip_purpose} ($${fmt(x.cost)}):`,
          `${x.narrative_justification}${yearlyStr ? ` (${yearlyStr})` : ''}`
        ));
      });
      rows.push(travelSummaryRow('Domestic Travel', domesticTotal, travelYearMap(domestic)));
    }

    if (foreign.length) {
      foreign.forEach(x => {
        const yearlyStr = (x.yearly_breakdown || []).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
        rows.push(lineItem(
          `${x.trip_purpose} ($${fmt(x.cost)}):`,
          `${x.narrative_justification}${yearlyStr ? ` (${yearlyStr})` : ''}`
        ));
      });
      rows.push(plain('All requested international air travel will be booked in strict accordance with the Fly America Act (49 U.S.C. § 40118), utilizing U.S. flag air carriers or compliant Open Skies agreement partner airlines wherever applicable.'));
      rows.push(travelSummaryRow('International Travel', foreignTotal, travelYearMap(foreign)));
    }

    if (domestic.length && foreign.length) {
      const allYearMap  = travelYearMap([...domestic, ...foreign]);
      const years       = Object.keys(allYearMap).sort();
      const combinedStr = years.map(yr => `$${fmt(allYearMap[yr])} in Year ${yr}`).join(', ');
      const projectYrs    = p.num_project_years || maxProjectYear(p);
      const performanceStr = projectYrs ? `for the ${projectYrs}-year period of performance` : 'during the period of performance';
      const { Paragraph, TextRun } = _docx;
      rows.push(new Paragraph({
        children: [
          new TextRun({ text: 'The total travel request is ' }),
          new TextRun({ text: `$${fmt(travelTotal)}`, bold: true }),
          new TextRun({ text: ` ${performanceStr}${combinedStr ? ` (${combinedStr})` : ''}.` })
        ],
        spacing: { after: 100 }
      }));
    }

    const psCategories = [
      { label: 'Stipends',     items: p.stipends           || [] },
      { label: 'Travel',       items: p.participant_travel || [] },
      { label: 'Subsistence',  items: p.subsistence        || [] },
      { label: 'Other',        items: p.participant_other  || [] }
    ];
    const psTotal = psCategories.flatMap(c => c.items).reduce((s, x) => s + (x.cost || 0), 0);

    rows.push(sectionHeader(`F. Participant Support Costs ($${fmt(psTotal)})`));

    if (p.participant_support_has_data) {
      const activeCategories = psCategories.filter(c => c.items.length > 0);

      activeCategories.forEach(({ label, items }) => {
        items.forEach(x => {
          const yearlyStr = (x.yearly_breakdown || []).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
          rows.push(lineItem(
            `${label} ($${fmt(x.cost)}):`,
            `${x.justification}${yearlyStr ? ` (${yearlyStr})` : ''}`
          ));
        });
      });

      if (activeCategories.length > 1) {
        const allYearMap  = {};
        psCategories.flat().forEach(x => (x.yearly_breakdown || []).forEach(y => {
          allYearMap[y.year] = (allYearMap[y.year] || 0) + y.cost;
        }));
        const years       = Object.keys(allYearMap).sort();
        const combinedStr = years.map(yr => `$${fmt(allYearMap[yr])} in Year ${yr}`).join(', ');
        const { Paragraph, TextRun } = _docx;
        rows.push(new Paragraph({
          children: [
            new TextRun({ text: 'The total request for Participant Support is ' }),
            new TextRun({ text: `$${fmt(psTotal)}`, bold: true }),
            new TextRun({ text: combinedStr ? ` (${combinedStr}).` : '.' })
          ],
          spacing: { after: 100 }
        }));
      }
    }

    const gSubsections = [
      {
        label: 'G.1',
        name:  'Materials and Supplies',
        items: p.materials_supplies || [],
        renderItem: x => ({ bold: `${x.category_name} ($${fmt(x.cost)}):`, text: x.narrative_justification })
      },
      {
        label: 'G.2',
        name:  'Publication Costs / Documentation / Dissemination',
        items: p.publications || [],
        renderItem: x => ({ bold: `${x.publication_title_or_type} ($${fmt(x.cost)}):`, text: x.narrative_justification })
      },
      {
        label: 'G.3',
        name:  'Consultant Services',
        items: p.consultants || [],
        renderItem: x => ({
          bold: `${x.consultant_name} ($${fmt(x.cost)}):`,
          text: `${x.consultant_name} will provide expertise in ${x.expertise_area} at a daily rate of $${fmt(x.rate)} for ${x.days} day${x.days === 1 ? '' : 's'} (${x.days} days × $${fmt(x.rate)}/day = $${fmt(x.days * x.rate)}). ${x.narrative_justification}`
        })
      },
      {
        label: 'G.4',
        name:  'Computer Services',
        items: p.computer_services || [],
        renderItem: x => ({ bold: `${x.service_description} ($${fmt(x.cost)}):`, text: x.narrative_justification })
      },
      {
        label: 'G.5',
        name:  'Subawards / Contractual',
        items: p.subawards || [],
        renderItem: x => ({
          bold: `${x.institution_name} ($${fmt(x.cost)}):`,
          text: `A separate budget and justification are attached for the subaward to ${x.institution_name} under the direction of ${x.sub_pi}. ${x.narrative_justification}`
        })
      },
      {
        label: 'G.6',
        name:  'Other',
        items: p.other_direct_lines || [],
        renderItem: x => ({ bold: `${x.item_name} ($${fmt(x.cost)}):`, text: x.narrative_justification })
      }
    ].filter(s => s.items.length > 0);

    const gTotal = gSubsections.flatMap(s => s.items).reduce((sum, x) => sum + (x.cost || 0), 0);
    rows.push(sectionHeader(`G. Other Direct Costs ($${fmt(gTotal)})`));

    gSubsections.forEach(section => {
      const sectionTotal = section.items.reduce((s, x) => s + (x.cost || 0), 0);
      rows.push(subHeader(`${section.label} ${section.name} ($${fmt(sectionTotal)})`));

      section.items.forEach(x => {
        const yearlyStr   = (x.yearly_breakdown || []).filter(y => (y.cost || 0) > 0).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
        const { bold, text } = section.renderItem(x);
        rows.push(lineItem(bold, `${text}${yearlyStr ? ` (${yearlyStr})` : ''}`));
      });

    });

    if (gSubsections.length > 1) {
      const allYearMap  = {};
      gSubsections.flatMap(s => s.items).forEach(x => (x.yearly_breakdown || []).forEach(y => {
        allYearMap[y.year] = (allYearMap[y.year] || 0) + y.cost;
      }));
      const years       = Object.keys(allYearMap).sort().filter(yr => allYearMap[yr] > 0);
      const combinedStr = years.map(yr => `$${fmt(allYearMap[yr])} in Year ${yr}`).join(', ');
      const { Paragraph, TextRun } = _docx;
      rows.push(new Paragraph({
        children: [
          new TextRun({ text: 'The total request for Other Direct Costs is ' }),
          new TextRun({ text: `$${fmt(gTotal)}`, bold: true }),
          new TextRun({ text: combinedStr ? ` (${combinedStr}).` : '.' })
        ],
        spacing: { after: 100 }
      }));
    }

    const ic = p.indirect_costs || {};
    const icYearlyStr = (ic.yearly_breakdown || []).filter(y => (y.cost || 0) > 0).map(y => `$${fmt(y.cost)} in Year ${y.year}`).join(', ');
    rows.push(sectionHeader(`I. Indirect Costs (Facilities and Administrative Costs) ($${fmt(ic.total_cost)})`));
    if (ic.narrative_description) rows.push(plain(ic.narrative_description));
    if (icYearlyStr) rows.push(plain(`Yearly Totals: ${icYearlyStr}.`));

    return rows;
  }



  const BUILDERS = {
    'nsf':          buildNsf
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
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
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
