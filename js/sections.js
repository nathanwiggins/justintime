const Sections = (() => {

  const registry = {

    'nsf': [
      {
        key:    'senior_personnel',
        label:  'A. Senior Personnel',
        fields: ['senior_personnel'],
        prompt: 'List each named senior/key personnel. Include their role, annual effort in months, and cumulative salary across all budget years. Write a concise narrative for each person describing their specific contribution to the project.',
        schema: {
          type: 'object',
          properties: { senior_personnel: Schemas['nsf'].properties.senior_personnel },
          required: ['senior_personnel']
        }
      },
      {
        key:    'other_personnel',
        label:  'B. Other Personnel',
        fields: ['other_personnel'],
        prompt: 'List all other personnel (graduate students, undergraduates, post-docs, technicians, administrative staff, etc.). Include role, annual effort in months, and cumulative salary. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { other_personnel: Schemas['nsf'].properties.other_personnel },
          required: ['other_personnel']
        }
      },
      {
        key:    'equipment',
        label:  'C. Equipment',
        fields: ['equipment'],
        prompt: 'List each equipment item (typically $5,000 or more per NSF policy). Provide the item name, total cost, and a justification explaining why this specific equipment is necessary for the proposed research. If no equipment is budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { equipment: Schemas['nsf'].properties.equipment },
          required: ['equipment']
        }
      },
      {
        key:    'domestic_travel',
        label:  'E.1 Domestic Travel',
        fields: ['domestic_travel'],
        prompt: 'List ONLY domestic (within the United States) travel. Include trip purpose, destination, number of travelers, conference or event name, total cost, and a justification. Do not include international travel here. If no domestic travel is budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { domestic_travel: Schemas['nsf'].properties.domestic_travel },
          required: ['domestic_travel']
        }
      },
      {
        key:    'foreign_travel',
        label:  'E.2 Foreign Travel',
        fields: ['foreign_travel'],
        prompt: 'List ONLY international or foreign travel. Include trip purpose, destination country or city, number of travelers, conference or event name, total cost, and a justification. Do not include US domestic travel here. If no foreign travel is budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { foreign_travel: Schemas['nsf'].properties.foreign_travel },
          required: ['foreign_travel']
        }
      },
      {
        key:    'participant_support',
        label:  'F. Participant Support',
        fields: ['stipends', 'participant_travel', 'subsistence', 'participant_other', 'participant_support_has_data'],
        prompt: 'Identify all participant support costs and populate each sub-category separately: stipends, participant travel, subsistence, and other participant costs. Set participant_support_has_data to true if ANY participant support line items exist in the budget; otherwise set it to false and return empty arrays for all sub-categories.',
        schema: {
          type: 'object',
          properties: {
            stipends:                     Schemas['nsf'].properties.stipends,
            participant_travel:           Schemas['nsf'].properties.participant_travel,
            subsistence:                  Schemas['nsf'].properties.subsistence,
            participant_other:            Schemas['nsf'].properties.participant_other,
            participant_support_has_data: Schemas['nsf'].properties.participant_support_has_data
          },
          required: ['stipends', 'participant_travel', 'subsistence', 'participant_other', 'participant_support_has_data']
        }
      },
      {
        key:    'materials_supplies',
        label:  'G. Materials & Supplies',
        fields: ['materials_supplies'],
        prompt: 'List consumable materials and supplies grouped by category. Provide the category name, total cost, and a justification explaining how the supplies will be used in the research. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { materials_supplies: Schemas['nsf'].properties.materials_supplies },
          required: ['materials_supplies']
        }
      },
      {
        key:    'publications',
        label:  'G. Publication Costs',
        fields: ['publications'],
        prompt: 'List any publication or research dissemination costs (journal page charges, open-access fees, report printing, etc.). Include the publication type or title, cost, and justification. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { publications: Schemas['nsf'].properties.publications },
          required: ['publications']
        }
      },
      {
        key:    'consultants',
        label:  'G. Consultant Services',
        fields: ['consultants'],
        prompt: 'List each consultant individually. Include their name, area of expertise, daily rate, number of days, total cost, and a justification explaining the specialized expertise they provide that is not available within the project team. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { consultants: Schemas['nsf'].properties.consultants },
          required: ['consultants']
        }
      },
      {
        key:    'computer_services',
        label:  'G. Computer Services',
        fields: ['computer_services'],
        prompt: 'List any purchased computing or IT services (cloud computing, HPC cluster access, database subscriptions, etc.). Include a service description, cost, and justification. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { computer_services: Schemas['nsf'].properties.computer_services },
          required: ['computer_services']
        }
      },
      {
        key:    'subawards',
        label:  'G. Subawards / Subcontracts',
        fields: ['subawards'],
        prompt: 'List each subaward or subcontract institution. Include the institution name, sub-PI name, total subaward cost, and a justification describing what unique work the subawardee will perform and why a subaward is necessary. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { subawards: Schemas['nsf'].properties.subawards },
          required: ['subawards']
        }
      },
      {
        key:    'other_direct_lines',
        label:  'G. Other Direct Costs',
        fields: ['other_direct_lines'],
        prompt: 'List any other direct cost items not captured in previous sections. Provide the item name, cost, and justification. Do NOT include fringe benefits or indirect/F&A costs here — those are captured separately. If none remain, return an empty array.',
        schema: {
          type: 'object',
          properties: { other_direct_lines: Schemas['nsf'].properties.other_direct_lines },
          required: ['other_direct_lines']
        }
      },
      {
        key:    'fringe_indirect',
        label:  'H. Fringe & Indirect Costs',
        fields: ['fringe_total_cost', 'indirect_total_cost'],
        prompt: 'Extract ONLY two numbers from the spreadsheet: the total cumulative fringe benefits cost across all budget years, and the total cumulative indirect (F&A) cost across all budget years. Do not narrate; just return the numbers.',
        schema: {
          type: 'object',
          properties: {
            fringe_total_cost:   Schemas['nsf'].properties.fringe_total_cost,
            indirect_total_cost: Schemas['nsf'].properties.indirect_total_cost
          },
          required: ['fringe_total_cost', 'indirect_total_cost']
        }
      }
    ],

    'nih-detailed': [
      {
        key:    'senior_personnel',
        label:  'A. Senior/Key Personnel',
        fields: ['senior_personnel'],
        prompt: 'List each named senior or key personnel. Include their role, effort in person months (Calendar, Academic, or Summer — never percentage), and cumulative salary. Write a concise narrative for each person describing their specific role and contribution to the project.',
        schema: {
          type: 'object',
          properties: { senior_personnel: Schemas['nih-detailed'].properties.senior_personnel },
          required: ['senior_personnel']
        }
      },
      {
        key:    'other_personnel',
        label:  'B. Other Personnel',
        fields: ['other_personnel'],
        prompt: 'List all other personnel (graduate students, research assistants, post-docs, technicians, etc.). Include role, effort in person months (Calendar, Academic, or Summer — never percentage), and cumulative salary. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { other_personnel: Schemas['nih-detailed'].properties.other_personnel },
          required: ['other_personnel']
        }
      },
      {
        key:    'equipment',
        label:  'C. Equipment',
        fields: ['equipment'],
        prompt: 'List each equipment item (typically $5,000 or more). Provide the item name, total cost, and a justification explaining why this specific equipment is essential for the proposed research. If no equipment is budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { equipment: Schemas['nih-detailed'].properties.equipment },
          required: ['equipment']
        }
      },
      {
        key:    'travel',
        label:  'D. Travel',
        fields: ['travel'],
        prompt: 'List all travel (domestic and international). For each trip include the travel type (Domestic or International), destination, number of travelers, purpose, total cost, and justification. If no travel is budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { travel: Schemas['nih-detailed'].properties.travel },
          required: ['travel']
        }
      },
      {
        key:    'trainee_support',
        label:  'E. Trainee Support',
        fields: ['trainee_support'],
        prompt: 'List trainee support costs (tuition, stipends, health insurance for trainees, etc.) by category. Include the category name, total cost, and justification. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { trainee_support: Schemas['nih-detailed'].properties.trainee_support },
          required: ['trainee_support']
        }
      },
      {
        key:    'materials_supplies',
        label:  'F. Materials & Supplies',
        fields: ['materials_supplies'],
        prompt: 'List consumable materials and supplies grouped by category. Provide the category name, total cost, and a justification explaining how the supplies will be used. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { materials_supplies: Schemas['nih-detailed'].properties.materials_supplies },
          required: ['materials_supplies']
        }
      },
      {
        key:    'publications',
        label:  'F. Publication Costs',
        fields: ['publications'],
        prompt: 'List any publication or dissemination costs (journal charges, open-access fees, etc.). Include the publication type, cost, and justification. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { publications: Schemas['nih-detailed'].properties.publications },
          required: ['publications']
        }
      },
      {
        key:    'consultants',
        label:  'F. Consultant Services',
        fields: ['consultants'],
        prompt: 'List each consultant with their name, area of expertise, total cost, and a justification explaining the specialized expertise they bring that is not available within the project team. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { consultants: Schemas['nih-detailed'].properties.consultants },
          required: ['consultants']
        }
      },
      {
        key:    'consortiums',
        label:  'F. Consortium / Contractual',
        fields: ['consortiums'],
        prompt: 'List each consortium or subaward. Include the institution name, sub-PI, total consortium cost, direct costs, and indirect costs. Clearly distinguish direct from indirect costs per NIH requirements. If no consortiums are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { consortiums: Schemas['nih-detailed'].properties.consortiums },
          required: ['consortiums']
        }
      },
      {
        key:    'user_fees',
        label:  'F. User Fees',
        fields: ['user_fees'],
        prompt: 'List any research facility or core user fees. Include the facility name, cost, and a justification explaining why this facility is necessary for the research. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { user_fees: Schemas['nih-detailed'].properties.user_fees },
          required: ['user_fees']
        }
      },
      {
        key:    'alterations',
        label:  'F. Alterations & Renovations',
        fields: ['alterations'],
        prompt: 'List any alterations or renovations to laboratory or research spaces. Include a description, cost, and justification. If none are budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { alterations: Schemas['nih-detailed'].properties.alterations },
          required: ['alterations']
        }
      },
      {
        key:    'other_direct_lines',
        label:  'F. Other Direct Costs',
        fields: ['other_direct_lines'],
        prompt: 'List any remaining direct cost items not captured in previous sections. Provide the item name, cost, and justification. Do NOT include fringe benefits or indirect costs here. If none remain, return an empty array.',
        schema: {
          type: 'object',
          properties: { other_direct_lines: Schemas['nih-detailed'].properties.other_direct_lines },
          required: ['other_direct_lines']
        }
      },
      {
        key:    'fringe_indirect',
        label:  'Fringe & Indirect Costs',
        fields: ['fringe_total_cost', 'indirect_total_cost'],
        prompt: 'Extract ONLY two numbers from the spreadsheet: the total cumulative fringe benefits cost across all budget years, and the total cumulative indirect (F&A) cost across all budget years. Do not narrate; just return the numbers.',
        schema: {
          type: 'object',
          properties: {
            fringe_total_cost:   Schemas['nih-detailed'].properties.fringe_total_cost,
            indirect_total_cost: Schemas['nih-detailed'].properties.indirect_total_cost
          },
          required: ['fringe_total_cost', 'indirect_total_cost']
        }
      }
    ],

    'nih-modular': [
      {
        key:    'personnel',
        label:  'Personnel Justification',
        fields: ['personnel'],
        prompt: 'List all personnel with their name, role, and effort in calendar person months. Do NOT include any dollar amounts, salaries, fringe rates, or cost totals — NIH Modular strictly prohibits specific dollar figures here.',
        schema: {
          type: 'object',
          properties: { personnel: Schemas['nih-modular'].properties.personnel },
          required: ['personnel']
        }
      },
      {
        key:    'consortium',
        label:  'Consortium Justification',
        fields: ['consortium'],
        prompt: 'List each consortium institution. Include the institution name, its location type (domestic or foreign), the sub-personnel name, their role, their effort in person months, and a narrative description of the work they will perform. If no consortiums exist, return an empty array.',
        schema: {
          type: 'object',
          properties: { consortium: Schemas['nih-modular'].properties.consortium },
          required: ['consortium']
        }
      },
      {
        key:    'additional_justification',
        label:  'Additional Narrative Justification',
        fields: ['additional_justification'],
        prompt: 'Provide any additional budget justification required — typically an explanation of budget variations between years (e.g., why Year 2 costs differ from Year 1). If no variation explanation is needed, return an empty array.',
        schema: {
          type: 'object',
          properties: { additional_justification: Schemas['nih-modular'].properties.additional_justification },
          required: ['additional_justification']
        }
      },
      {
        key:    'fringe_indirect',
        label:  'Fringe & Indirect Costs',
        fields: ['fringe_total_cost', 'indirect_total_cost'],
        prompt: 'Extract ONLY two numbers from the spreadsheet: the total cumulative fringe benefits cost across all budget years, and the total cumulative indirect (F&A) cost across all budget years. Do not narrate; just return the numbers.',
        schema: {
          type: 'object',
          properties: {
            fringe_total_cost:   Schemas['nih-modular'].properties.fringe_total_cost,
            indirect_total_cost: Schemas['nih-modular'].properties.indirect_total_cost
          },
          required: ['fringe_total_cost', 'indirect_total_cost']
        }
      }
    ],

    'generic': [
      {
        key:    'personnel',
        label:  'Personnel',
        fields: ['personnel'],
        prompt: 'List all project personnel with their name, role, annual effort in months, and cumulative salary. Write a concise narrative for each person describing their contribution to the project.',
        schema: {
          type: 'object',
          properties: { personnel: Schemas['generic'].properties.personnel },
          required: ['personnel']
        }
      },
      {
        key:    'equipment',
        label:  'Equipment',
        fields: ['equipment'],
        prompt: 'List each major equipment item with its name, cost, and a justification explaining why it is necessary for the project. If no equipment is budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { equipment: Schemas['generic'].properties.equipment },
          required: ['equipment']
        }
      },
      {
        key:    'travel',
        label:  'Travel',
        fields: ['travel'],
        prompt: 'List all travel with destination, total cost, and a justification explaining the purpose of the travel and its connection to the project. If no travel is budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { travel: Schemas['generic'].properties.travel },
          required: ['travel']
        }
      },
      {
        key:    'direct_costs',
        label:  'Other Direct Costs',
        fields: ['direct_costs'],
        prompt: 'List all remaining direct cost items (supplies, services, consultants, publications, etc.) by category or item. Provide the category or item name, cost, and justification. If none remain, return an empty array.',
        schema: {
          type: 'object',
          properties: { direct_costs: Schemas['generic'].properties.direct_costs },
          required: ['direct_costs']
        }
      },
      {
        key:    'fringe_indirect',
        label:  'Fringe & Indirect Costs',
        fields: ['fringe_total_cost', 'indirect_total_cost'],
        prompt: 'Extract ONLY two numbers from the spreadsheet: the total cumulative fringe benefits cost across all budget years, and the total cumulative indirect (F&A) cost across all budget years. Do not narrate; just return the numbers.',
        schema: {
          type: 'object',
          properties: {
            fringe_total_cost:   Schemas['generic'].properties.fringe_total_cost,
            indirect_total_cost: Schemas['generic'].properties.indirect_total_cost
          },
          required: ['fringe_total_cost', 'indirect_total_cost']
        }
      }
    ]

  };

  function forTemplate(templateType) {
    return registry[templateType] || [];
  }

  return { forTemplate };
})();
