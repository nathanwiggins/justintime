const Sections = (() => {

  const registry = {

    'nsf': [
      {
        key:    'senior_personnel',
        label:  'A. Senior Personnel',
        fields: ['senior_personnel'],
        prompt: 'List each named senior/key personnel. Include their role, annual effort in months, and cumulative salary across all budget years. Do not assume titles or credentials (Dr., PhD) unless explicitly stated in the budget. Write a concise narrative for each person describing their specific contribution to the project. effort_months_per_year must be the effort PER YEAR, NOT the total across all years. Never multiply or sum months across years. Always set escalation_note to an empty string — it is computed automatically from yearly_breakdown after extraction.',
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
        prompt: 'List all non-senior personnel grouped by role category. This section covers unnamed role groups such as Postdoctoral Scholars, Graduate Students, Undergraduate Students, and Other Professionals. For each group: Analyze the spreadsheet to determine if the role is paid hourly or annually. Set rate_type strictly to "hourly" or "annual". Extract the corresponding wage or stipend into rate_amount. Set effort_description to explicitly clarify the per-person effort. For annual roles use formats like "X Calendar months each per year". For hourly roles use formats like "X hours each per year". Never output a flat "12 months" or "500 hours" without the "each" clarifier when there are multiple individuals. Write a concise narrative for each group describing their role in the project. Always set escalation_note to an empty string — it is computed automatically from yearly_breakdown after extraction.',
        schema: {
          type: 'object',
          properties: { other_personnel: Schemas['nsf'].properties.other_personnel },
          required: ['other_personnel']
        }
      },
      {
        key:    'fringe_benefits',
        label:  'C. Fringe Benefits',
        fields: ['fringe_benefits'],
        prompt: 'Generate the fringe benefits justification for Section C using the institutional fringe rate context provided. Use the provided institutional fringe rate context to build the rate_groups array. Create separate objects for personnel groups based on the rates described in the context. For each group, calculate and provide a clear yearly_breakdown showing the exact dollar amount of fringe benefits requested per year, culminating in a category_total. The yearly costs must be derived from the personnel salaries in the spreadsheet multiplied by the applicable rates from the institutional context. Write a concise narrative_description that details the institutional rates being applied, ensuring the text explicitly references the specific percentages, detailed breakdowns, and fringe amounts provided in the context. Also set total_cost to the cumulative sum of all category_total values across all rate groups.',
        schema: {
          type: 'object',
          properties: { fringe_benefits: Schemas['nsf'].properties.fringe_benefits },
          required: ['fringe_benefits']
        }
      },
      {
        key:    'equipment',
        label:  'D. Equipment',
        fields: ['equipment'],
        prompt: 'List each category of equipment as a SEPARATE array entry. Do NOT group, combine, or aggregate multiple categories of equipment into a single array entry under any circumstances. Each entry must contain the specific item name for that single piece of equipment, its total cost summed cumulatively across all budget years, and an individual narrative justification explaining why that specific piece is essential for the proposed research and how the cost was derived (if applicable). If no equipment is budgeted, return an empty array.',
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
        prompt: 'Separate all travel into two categories — domestic_travel (within the United States only) and foreign_travel (all international destinations). Model each distinct trip variant (e.g. a specific destination/purpose combination) as its own separate array entry — do not nest or group multiple trip variants together. For each trip provide: trip purpose, destination, number of travelers, conference or event name, total cost summed cumulatively across all budget years, a yearly_breakdown array showing the cost for each year this trip occurs (if a trip only occurs in certain years, only include those years), and a narrative justification that describes the purpose of the trip. Every narrative_justification should begin with a phrase like "Funds are requested". Additionally, populate cost_breakdown with each individual cost component that makes up this trip\'s estimated cost (e.g. airfare, mileage, lodging, per diem, registration). component_name must be exactly one of: "Airfare", "Mileage", "Lodging", "Per Diem", "Registration", "Other". For each component, set formula to the exact rate × quantity calculation from the spreadsheet (e.g. "238 miles x $0.72/mile", "$100/night x 2 people x 1 night"), and amount to the resulting dollar figure. Return an empty array for cost_breakdown if the spreadsheet does not itemize this trip\'s costs. If no domestic travel is budgeted return an empty array for domestic_travel. If no foreign travel is budgeted return an empty array for foreign_travel.',
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
        prompt: 'The purpose of participant support costs is to provide direct financial assistance to external individuals or trainees participating in training, conferences, workshops, or educational programs funded by the grant. Populate each of these pre-defined sub-categories if they exist: stipends, participant travel, subsistence, and other participant costs. For each item include num_participants (the headcount of participants receiving this support), the total cost summed cumulatively across all budget years, a yearly_breakdown showing the cost for each year this support occurs, and a detailed, multi-sentence justification that specifies the headcount, per-participant rate or cost basis, and the purpose of the support. If there are no participant support costs, return empty arrays for all sub-categories.',
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
        prompt: 'Populate the other direct cost sub-categories that have budgeted items, summing each cost cumulatively across all budget years. For each item include a yearly_breakdown showing the cost for each year, and write detailed multi-sentence justifications. materials_supplies: consumable supplies grouped by category. publications: journal page charges or open-access fees. consultants: NSF COMPLIANCE REQUIRED — for each consultant you MUST explicitly state their full name, specific area of expertise, daily rate ($/day), and exact number of days; the narrative must include the formula "X days × $Y/day = $Z" and a detailed explanation of why this expertise is essential to the project. computer_services: purchased computing or IT services. subawards: each subaward institution with institution name, sub-PI name, and detailed scope of work. other_direct_lines: any remaining direct cost items not covered above. Return an empty array for any sub-category with no budgeted items.',
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
        key:    'indirect_costs',
        label:  'I. Indirect Costs',
        fields: ['indirect_costs'],
        prompt: 'Generate a simple justification of indirect costs using the institutional F&A rate context provided. Write a brief narrative_description (1-2 sentences) summarizing the indirect rate being applied, derived only from the Institutional Context — do not invent rate information. Extract total_cost as the total cumulative indirect/F&A cost across all budget years. Provide a yearly_breakdown showing the indirect cost for each budget year.',
        schema: {
          type: 'object',
          properties: { indirect_costs: Schemas['nsf'].properties.indirect_costs },
          required: ['indirect_costs']
        }
      }
    ],

    'general': [
      {
        key:    'personnel',
        label:  'A. Personnel',
        fields: ['senior_personnel', 'other_personnel'],
        prompt: 'Populate two personnel arrays: senior_personnel and other_personnel.\n\nFor senior_personnel: List each named senior/key personnel. Include their role, annual effort in months, and cumulative salary across all budget years. Do not assume titles or credentials (Dr., PhD) unless explicitly stated in the budget. Write a concise narrative for each person describing their specific contribution to the project. effort_months_per_year must be the effort PER YEAR, NOT the total across all years. Never multiply or sum months across years. Always set escalation_note to an empty string — it is computed automatically from yearly_breakdown after extraction.\n\nFor other_personnel: List all non-senior personnel grouped by role category. This section covers unnamed role groups such as Postdoctoral Scholars, Graduate Students, Undergraduate Students, and Other Professionals. For each group: Analyze the spreadsheet to determine if the role is paid hourly or annually. Set rate_type strictly to "hourly" or "annual". Extract the corresponding wage or stipend into rate_amount. Set effort_description to explicitly clarify the per-person effort. For annual roles use formats like "X Calendar months each per year". For hourly roles use formats like "X hours each per year". Never output a flat "12 months" or "500 hours" without the "each" clarifier when there are multiple individuals. Write a concise narrative for each group describing their role in the project. Always set escalation_note to an empty string — it is computed automatically from yearly_breakdown after extraction.',
        schema: {
          type: 'object',
          properties: {
            senior_personnel: Schemas['general'].properties.senior_personnel,
            other_personnel:  Schemas['general'].properties.other_personnel
          },
          required: ['senior_personnel', 'other_personnel']
        }
      },
      {
        key:    'fringe_benefits',
        label:  'B. Fringe Benefits',
        fields: ['fringe_benefits'],
        prompt: 'Generate the fringe benefits justification using the institutional fringe rate context provided. Use the provided institutional fringe rate context to build the rate_groups array. Create separate objects for personnel groups based on the rates described in the context. For each group, calculate and provide a clear yearly_breakdown showing the exact dollar amount of fringe benefits requested per year, culminating in a category_total. The yearly costs must be derived from the personnel salaries in the spreadsheet multiplied by the applicable rates from the institutional context. Write a concise narrative_description that details the institutional rates being applied, ensuring the text explicitly references the specific percentages, detailed breakdowns, and fringe amounts provided in the context. Also set total_cost to the cumulative sum of all category_total values across all rate groups.',
        schema: {
          type: 'object',
          properties: { fringe_benefits: Schemas['general'].properties.fringe_benefits },
          required: ['fringe_benefits']
        }
      },
      {
        key:    'travel',
        label:  'C. Travel',
        fields: ['domestic_travel', 'foreign_travel'],
        prompt: 'Separate all travel into two categories — domestic_travel (within the United States only) and foreign_travel (all international destinations). Model each distinct trip variant (e.g. a specific destination/purpose combination) as its own separate array entry — do not nest or group multiple trip variants together. For each trip provide: trip purpose, destination, number of travelers, conference or event name, total cost summed cumulatively across all budget years, a yearly_breakdown array showing the cost for each year this trip occurs (if a trip only occurs in certain years, only include those years), and a narrative justification that describes the purpose of the trip. Every narrative_justification should begin with a phrase like "Funds are requested". Additionally, populate cost_breakdown with each individual cost component that makes up this trip\'s estimated cost (e.g. airfare, mileage, lodging, per diem, registration). component_name must be exactly one of: "Airfare", "Mileage", "Lodging", "Per Diem", "Registration", "Other". For each component, set formula to the exact rate × quantity calculation from the spreadsheet (e.g. "238 miles x $0.72/mile", "$100/night x 2 people x 1 night"), and amount to the resulting dollar figure. Return an empty array for cost_breakdown if the spreadsheet does not itemize this trip\'s costs. If no domestic travel is budgeted return an empty array for domestic_travel. If no foreign travel is budgeted return an empty array for foreign_travel.',
        schema: {
          type: 'object',
          properties: {
            domestic_travel: Schemas['general'].properties.domestic_travel,
            foreign_travel:  Schemas['general'].properties.foreign_travel
          },
          required: ['domestic_travel', 'foreign_travel']
        }
      },
      {
        key:    'equipment',
        label:  'D. Equipment',
        fields: ['equipment'],
        prompt: 'List each category of equipment as a SEPARATE array entry. Do NOT group, combine, or aggregate multiple categories of equipment into a single array entry under any circumstances. Each entry must contain the specific item name for that single piece of equipment, its total cost summed cumulatively across all budget years, and an individual narrative justification explaining why that specific piece is essential for the proposed research and how the cost was derived (if applicable). If no equipment is budgeted, return an empty array.',
        schema: {
          type: 'object',
          properties: { equipment: Schemas['general'].properties.equipment },
          required: ['equipment']
        }
      },
      {
        key:    'supplies',
        label:  'E. Supplies',
        fields: ['materials_supplies'],
        prompt: 'Populate materials_supplies with each category of consumable supplies as a separate array entry, summing each cost cumulatively across all budget years. For each entry include a yearly_breakdown showing the cost for each year, and a detailed, multi-sentence justification explaining what the supplies are and why they are needed for the project. Return an empty array if no supplies are budgeted.',
        schema: {
          type: 'object',
          properties: { materials_supplies: Schemas['general'].properties.materials_supplies },
          required: ['materials_supplies']
        }
      },
      {
        key:    'contractual',
        label:  'F. Contractual',
        fields: ['consultants', 'subawards'],
        prompt: 'Populate two arrays: consultants and subawards, summing each cost cumulatively across all budget years and including a yearly_breakdown showing the cost for each year.\n\nFor consultants: NSF COMPLIANCE REQUIRED — for each consultant you MUST explicitly state their full name, specific area of expertise, daily rate ($/day), and exact number of days; the narrative must include the formula "X days × $Y/day = $Z" and a detailed explanation of why this expertise is essential to the project.\n\nFor subawards: list each subaward institution with institution name, sub-PI name, and detailed scope of work.\n\nReturn an empty array for either category with no budgeted items.',
        schema: {
          type: 'object',
          properties: {
            consultants: Schemas['general'].properties.consultants,
            subawards:   Schemas['general'].properties.subawards
          },
          required: ['consultants', 'subawards']
        }
      },
      {
        key:    'construction',
        label:  'G. Construction',
        fields: ['construction_costs'],
        prompt: 'Determine whether the budget includes any construction, renovation, or facility-related costs — as distinct from ordinary equipment or supplies. Typical categories (per the federal SF-424C Budget Information for Construction Programs form) include: site work, demolition and removal, land/structures/rights-of-way, architectural and engineering fees, project inspection fees, construction or major renovation, and contingencies for construction. List each such cost category as a SEPARATE array entry, summing each cost cumulatively across all budget years. For each entry include a yearly_breakdown showing the cost for each year, and a detailed, multi-sentence justification explaining the work and why it is necessary for the project. Return an empty array if no construction-related costs are budgeted.',
        schema: {
          type: 'object',
          properties: { construction_costs: Schemas['general'].properties.construction_costs },
          required: ['construction_costs']
        }
      },
      {
        key:    'other',
        label:  'H. Other',
        fields: ['stipends', 'participant_travel', 'subsistence', 'participant_other', 'participant_support_has_data', 'publications', 'computer_services', 'other_direct_lines'],
        prompt: 'Populate the sub-categories below that have budgeted items, summing each cost cumulatively across all budget years. For each item include a yearly_breakdown showing the cost for each year, and write detailed multi-sentence justifications.\n\nParticipant Support: The purpose of participant support costs is to provide direct financial assistance to external individuals or trainees participating in training, conferences, workshops, or educational programs funded by the grant. Populate each of these pre-defined sub-categories if they exist: stipends, participant travel, subsistence, and other participant costs. For each item include num_participants (the headcount of participants receiving this support) in addition to cost, yearly_breakdown, and justification. If there are no participant support costs, return empty arrays for all four sub-categories.\n\npublications: journal page charges or open-access fees.\n\ncomputer_services: purchased computing or IT services.\n\nother_direct_lines: any remaining direct cost items not covered above.\n\nReturn an empty array for any sub-category with no budgeted items.',
        schema: {
          type: 'object',
          properties: {
            stipends:                     Schemas['general'].properties.stipends,
            participant_travel:           Schemas['general'].properties.participant_travel,
            subsistence:                  Schemas['general'].properties.subsistence,
            participant_other:            Schemas['general'].properties.participant_other,
            participant_support_has_data: Schemas['general'].properties.participant_support_has_data,
            publications:                 Schemas['general'].properties.publications,
            computer_services:            Schemas['general'].properties.computer_services,
            other_direct_lines:           Schemas['general'].properties.other_direct_lines
          },
          required: ['stipends', 'participant_travel', 'subsistence', 'participant_other', 'participant_support_has_data', 'publications', 'computer_services', 'other_direct_lines']
        }
      },
      {
        key:    'indirect_costs',
        label:  'I. Indirect Costs',
        fields: ['indirect_costs'],
        prompt: 'Generate a simple justification of indirect costs using the institutional F&A rate context provided. Write a brief narrative_description (1-2 sentences) summarizing the indirect rate being applied, derived only from the Institutional Context — do not invent rate information. Extract total_cost as the total cumulative indirect/F&A cost across all budget years. Provide a yearly_breakdown showing the indirect cost for each budget year.',
        schema: {
          type: 'object',
          properties: { indirect_costs: Schemas['general'].properties.indirect_costs },
          required: ['indirect_costs']
        }
      }
    ],

  };

  function forTemplate(templateType) {
    return registry[templateType] || [];
  }

  return { forTemplate };
})();
