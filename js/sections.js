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
        prompt: 'Separate all travel into two categories — domestic_travel (within the United States only) and foreign_travel (all international destinations). For each trip provide: trip purpose, destination, number of travelers, conference or event name, total cost summed cumulatively across all budget years, a yearly_breakdown array showing the cost for each year this trip occurs (if a trip only occurs in certain years, only include those years), and a narrative justification that describes the purpose of the trip and the breakdown of associated costs (e.g., airfare, lodging, per diem). CRITICAL: every narrative_justification must begin with the exact phrase "Funds are requested". If no domestic travel is budgeted return an empty array for domestic_travel. If no foreign travel is budgeted return an empty array for foreign_travel.',
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
        prompt: 'Participant support costs are exempt from indirect costs and must be listed separately from general direct costs. Populate each sub-category: stipends, participant travel, subsistence, and other participant costs. Set participant_support_has_data to true if ANY participant support line items exist in the budget; otherwise set it to false and return empty arrays for all sub-categories.',
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
        prompt: 'Populate all six other direct cost sub-categories, summing each cost cumulatively across all budget years. materials_supplies: consumable supplies grouped by category with cost and justification. publications: journal page charges or open-access fees with cost and justification. consultants: each consultant with name, expertise area, daily rate, number of days, total cost, and justification. computer_services: purchased computing or IT services with description, cost, and justification. subawards: each subaward institution with institution name, sub-PI name, total cost, and justification. other_direct_lines: any remaining direct cost items not covered above with item name, cost, and justification. Do NOT include fringe benefits or indirect costs in any of these arrays. Return an empty array for any sub-category with no budgeted items.',
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
        label:  'H. Indirect Costs',
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

    'nih-detailed': [
      {
        key:    'senior_personnel',
        label:  'A. Senior/Key Personnel',
        fields: ['senior_personnel'],
        prompt: 'List each named senior or key personnel. Effort MUST be stated in person months (Calendar, Academic, or Summer) — percentage effort is obsolete and must never be used. Include cumulative salary across all budget years and a concise narrative describing each person\'s specific role and contribution.',
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
        prompt: 'List all other personnel (graduate students, research assistants, post-docs, technicians, etc.). Effort MUST be stated in person months (Calendar, Academic, or Summer) — percentage effort is obsolete and must never be used. Include cumulative salary across all budget years. If none are budgeted, return an empty array.',
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
        prompt: 'List each equipment item (typically $5,000 or more). Provide the item name, total cost summed cumulatively across all budget years, and a justification explaining why this specific equipment is essential for the proposed research. If no equipment is budgeted, return an empty array.',
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
        prompt: 'List all travel (domestic and international), summing each trip cost cumulatively across all budget years. For each trip include the travel type (Domestic or International), destination, number of travelers, purpose, total cost, and justification. If no travel is budgeted, return an empty array.',
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
        prompt: 'List trainee support costs (tuition, stipends, health insurance for trainees, etc.) by category, summing each cost cumulatively across all budget years. Include the category name, total cost, and justification. If none are budgeted, return an empty array.',
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
        prompt: 'Populate all seven other direct cost sub-categories, summing each cost cumulatively across all budget years. materials_supplies: consumable supplies grouped by category with cost and justification. publications: journal page charges or open-access fees with publication type, cost, and justification. consultants: each consultant with name, expertise area, total cost, and justification. consortiums: each subaward institution with institution name, sub-PI, total cost, direct costs, and indirect costs — the direct and indirect costs MUST be clearly distinguished and listed separately per NIH requirements. user_fees: research facility or core user fees with facility name, cost, and justification. alterations: lab or space renovations with description, cost, and justification. other_direct_lines: any remaining direct cost items not covered above with item name, cost, and justification. Do NOT include fringe benefits or indirect costs in any of these arrays. Return an empty array for any sub-category with no budgeted items.',
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
        prompt: 'Extract ONLY two numbers from the spreadsheet: the total cumulative fringe benefits cost across all budget years (fringe_total_cost), and the total cumulative indirect/F&A cost across all budget years (indirect_total_cost). Do not narrate; just return the numbers.',
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
        prompt: 'List all personnel with their name, role, and effort in calendar person months. Do NOT include any dollar amounts, salaries, fringe rates, or cost totals — NIH Modular guidelines strictly prohibit specific dollar figures in the personnel justification.',
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
        prompt: 'List each consortium institution. Include the institution name, its location type (domestic or foreign), the sub-personnel name, their role, their effort in person months, and a narrative description of the work they will perform. Do NOT include any dollar amounts, cost figures, or financial totals — NIH Modular guidelines prohibit specific dollar figures here. If no consortiums exist, return an empty array.',
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
        prompt: 'Extract ONLY two numbers from the spreadsheet: the total cumulative fringe benefits cost across all budget years (fringe_total_cost), and the total cumulative indirect/F&A cost across all budget years (indirect_total_cost). Do not narrate; just return the numbers.',
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
        prompt: 'List all remaining direct cost items (supplies, services, consultants, publications, etc.) by category or item, summing each cost cumulatively across all budget years. Provide the category or item name, cost, and justification. Do NOT include fringe benefits or indirect costs here. If none remain, return an empty array.',
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
