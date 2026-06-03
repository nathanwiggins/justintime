const Sections = (() => {

  const registry = {

    'nsf': [
      {
        key:    'senior_personnel',
        label:  'A. Senior Personnel',
        fields: ['senior_personnel'],
        prompt: 'List each named senior/key personnel. Include their role, annual effort in months, and effort type (Summer, Academic, or Calendar). Crucially, extract or calculate their base_salary (Institutional Base Salary) based on Year 1 requests. Map out their requested salary for each budget year in the yearly_breakdown array, accounting for and explicitly stating any stated escalation rates (e.g., 3%). Finally, provide the cumulative total_salary and a narrative describing their specific contribution.',
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
        key:    'travel',
        label:  'E. Travel',
        fields: ['domestic_travel', 'foreign_travel'],
        prompt: 'Separate all travel into two categories. domestic_travel covers trips within the United States only. foreign_travel covers all international destinations. For each trip include trip purpose, destination, number of travelers, conference or event name, total cost, and justification. If no domestic travel is budgeted return an empty array for domestic_travel. If no foreign travel is budgeted return an empty array for foreign_travel.',
        schema: {
          type: 'object',
          properties: {
            domestic_travel: Schemas['nsf'].properties.domestic_travel,
            foreign_travel:  Schemas['nsf'].properties.foreign_travel
          },
          required: ['domestic_travel', 'foreign_travel']
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
        key:    'other_direct_costs',
        label:  'G. Other Direct Costs',
        fields: ['materials_supplies', 'publications', 'consultants', 'computer_services', 'subawards', 'other_direct_lines'],
        prompt: 'Populate all six other direct cost sub-categories from the budget spreadsheet in a single response. materials_supplies: consumable supplies grouped by category with cost and justification. publications: journal page charges or open-access fees with cost and justification. consultants: each consultant with name, expertise area, daily rate, number of days, total cost, and justification. computer_services: purchased computing or IT services with description, cost, and justification. subawards: each subaward institution with institution name, sub-PI name, total cost, and justification. other_direct_lines: any remaining direct cost items not covered above with item name, cost, and justification. Do NOT include fringe benefits or indirect costs in any of these arrays. Return an empty array for any sub-category with no budgeted items.',
        schema: {
          type: 'object',
          properties: {
            materials_supplies:  Schemas['nsf'].properties.materials_supplies,
            publications:        Schemas['nsf'].properties.publications,
            consultants:         Schemas['nsf'].properties.consultants,
            computer_services:   Schemas['nsf'].properties.computer_services,
            subawards:           Schemas['nsf'].properties.subawards,
            other_direct_lines:  Schemas['nsf'].properties.other_direct_lines
          },
          required: ['materials_supplies', 'publications', 'consultants', 'computer_services', 'subawards', 'other_direct_lines']
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
        key:    'other_direct_costs',
        label:  'G. Other Direct Costs',
        fields: ['materials_supplies', 'publications', 'consultants', 'consortiums', 'user_fees', 'alterations', 'other_direct_lines'],
        prompt: 'Populate all seven other direct cost sub-categories from the budget spreadsheet in a single response. materials_supplies: consumable supplies grouped by category with cost and justification. publications: journal page charges or open-access fees with publication type, cost, and justification. consultants: each consultant with name, expertise area, total cost, and justification. consortiums: each subaward institution with institution name, sub-PI, total cost, direct costs, and indirect costs — clearly distinguish direct from indirect per NIH requirements. user_fees: research facility or core user fees with facility name, cost, and justification. alterations: lab or space renovations with description, cost, and justification. other_direct_lines: any remaining direct cost items not covered above with item name, cost, and justification. Do NOT include fringe benefits or indirect costs in any of these arrays. Return an empty array for any sub-category with no budgeted items.',
        schema: {
          type: 'object',
          properties: {
            materials_supplies:  Schemas['nih-detailed'].properties.materials_supplies,
            publications:        Schemas['nih-detailed'].properties.publications,
            consultants:         Schemas['nih-detailed'].properties.consultants,
            consortiums:         Schemas['nih-detailed'].properties.consortiums,
            user_fees:           Schemas['nih-detailed'].properties.user_fees,
            alterations:         Schemas['nih-detailed'].properties.alterations,
            other_direct_lines:  Schemas['nih-detailed'].properties.other_direct_lines
          },
          required: ['materials_supplies', 'publications', 'consultants', 'consortiums', 'user_fees', 'alterations', 'other_direct_lines']
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
