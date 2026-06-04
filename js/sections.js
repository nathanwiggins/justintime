const Sections = (() => {

  const registry = {

    'nsf': [
      {
        key:    'senior_personnel',
        label:  'A. Senior Personnel',
        fields: ['senior_personnel'],
        prompt: 'List each named senior/key personnel. Include their role, annual effort in months, and cumulative salary across all budget years. Do not assume titles or credentials (Dr., PhD) unless explicitly stated in the budget. Write a concise narrative for each person describing their specific contribution to the project. effort_months_per_year must be the effort PER YEAR, NOT the total across all years. Never multiply or sum months across years. For escalation_note: if the spreadsheet shows year-over-year salary changes for this person, write a single brief sentence describing only what the spreadsheet states (e.g., "Salary reflects a 3% annual increase." or "Salary reflects a $2,500 annual increase."). Do not invent, assume, or reference any policy not explicitly present in the spreadsheet. If costs are flat across all years, return an empty string.',
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
        prompt: 'List all non-senior personnel grouped by role category. This section covers unnamed role groups such as Postdoctoral Scholars, Graduate Students, Undergraduate Students, and Other Professionals. For each group: Analyze the spreadsheet to determine if the role is paid hourly or annually. Set rate_type strictly to "hourly" or "annual". Extract the corresponding wage or stipend into rate_amount. Set effort_description to explicitly clarify the per-person effort. For annual roles use formats like "X Calendar months each per year". For hourly roles use formats like "X hours each per year". Never output a flat "12 months" or "500 hours" without the "each" clarifier when there are multiple individuals. Write a concise narrative for each group describing their role in the project. For escalation_note: if the spreadsheet shows year-over-year rate changes for this group, write a single brief sentence describing only what the spreadsheet states (e.g., "Stipends reflect a 3% annual increase." or "Wages reflect a $1.00/hour annual increase."). Do not invent, assume, or reference any policy not explicitly present in the spreadsheet. If rates are flat across all years, return an empty string.',
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
        prompt: 'Separate all travel into two categories — domestic_travel (within the United States only) and foreign_travel (all international destinations). For each trip provide: trip purpose, destination, number of travelers, conference or event name, total cost summed cumulatively across all budget years, a yearly_breakdown array showing the cost for each year this trip occurs (if a trip only occurs in certain years, only include those years), and a narrative justification that describes the purpose of the trip and the breakdown of associated costs (e.g., airfare, lodging, per diem). Every narrative_justification should begin with a phrase like "Funds are requested". If no domestic travel is budgeted return an empty array for domestic_travel. If no foreign travel is budgeted return an empty array for foreign_travel.',
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
        prompt: 'Populate the other direct cost sub-categories that have budgeted items, summing each cost cumulatively across all budget years. For each item include a yearly_breakdown showing the cost for each year, and write detailed multi-sentence justifications. materials_supplies: consumable supplies grouped by category. publications: journal page charges or open-access fees. consultants: NSF COMPLIANCE REQUIRED — for each consultant you MUST explicitly state their full name, specific area of expertise, daily rate ($/day), and exact number of days; the narrative must include the formula "X days × $Y/day = $Z" and a detailed explanation of why this expertise is essential to the project. computer_services: purchased computing or IT services. subawards: each subaward institution with institution name, sub-PI name, and detailed scope of work. other_direct_lines: any remaining direct cost items not covered above. Do NOT include fringe benefits or indirect costs in any of these arrays. Return an empty array for any sub-category with no budgeted items.',
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
        fields: ['indirect_total_cost'],
        prompt: 'Extract ONLY one number from the spreadsheet: the total cumulative indirect/F&A cost across all budget years (indirect_total_cost). Do not narrate; just return the number.',
        schema: {
          type: 'object',
          properties: {
            indirect_total_cost: Schemas['nsf'].properties.indirect_total_cost
          },
          required: ['indirect_total_cost']
        }
      }
    ],

    'generic': [
      {
        key:    'personnel',
        label:  'Personnel',
        fields: ['personnel'],
        prompt: 'List all project personnel with their name, role, annual effort in months, and cumulative salary across all budget years. Write a concise narrative for each person describing their contribution to the project.',
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
        prompt: 'List each major equipment item with its name, total cost summed cumulatively across all budget years, and a justification explaining why it is necessary for the project. If no equipment is budgeted, return an empty array.',
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
        prompt: 'List all travel with destination, total cost summed cumulatively across all budget years, and a justification explaining the purpose and its connection to the project. If no travel is budgeted, return an empty array.',
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
        prompt: 'List all other direct cost items by category or item, summing each cost cumulatively across all budget years. Provide the category or item name, cost, and justification. The categories in this section are G.1 Materials and Supplies, G.2 Publication Costs / Documentation / Dissemination, G.3 Consultant Services, G.4 Computer Services, G.5 Subawards, G.6 Other. If there are no other direct costs, return an empty array.',
        schema: {
          type: 'object',
          properties: { direct_costs: Schemas['generic'].properties.direct_costs },
          required: ['direct_costs']
        }
      },
      {
        key:    'fringe_and_indirect',
        label:  'Fringe & Indirect Costs',
        fields: ['fringe_total_cost', 'indirect_total_cost'],
        prompt: 'Extract ONLY two numbers from the spreadsheet: the total cumulative fringe benefits cost across all budget years (fringe_total_cost), and the total cumulative indirect/F&A cost across all budget years (indirect_total_cost). Do not narrate; just return the numbers.',
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
