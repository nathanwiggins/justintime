const Schemas = {

  'nsf': {
    type: 'object',
    properties: {
      senior_personnel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:                   { type: 'string' },
            role:                   { type: 'string' },
            effort_months:          { type: 'string' },
            effort_type:            { type: 'string' },
            salary:                 { type: 'number' },
            narrative_description:  { type: 'string' }
          },
          required: ['name', 'role', 'effort_months', 'effort_type', 'salary', 'narrative_description']
        }
      },
      other_personnel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name_or_title:          { type: 'string' },
            role:                   { type: 'string' },
            effort_months:          { type: 'string' },
            effort_type:            { type: 'string' },
            salary:                 { type: 'number' },
            narrative_description:  { type: 'string' }
          },
          required: ['name_or_title', 'role', 'effort_months', 'effort_type', 'salary', 'narrative_description']
        }
      },
      equipment: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name:              { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['item_name', 'cost', 'narrative_justification']
        }
      },
      domestic_travel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            trip_purpose:           { type: 'string' },
            destination:            { type: 'string' },
            num_people:             { type: 'number' },
            event_name:             { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['trip_purpose', 'destination', 'num_people', 'event_name', 'cost', 'narrative_justification']
        }
      },
      foreign_travel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            trip_purpose:           { type: 'string' },
            destination:            { type: 'string' },
            num_people:             { type: 'number' },
            event_name:             { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['trip_purpose', 'destination', 'num_people', 'event_name', 'cost', 'narrative_justification']
        }
      },
      stipends: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cost:         { type: 'number' },
            justification:{ type: 'string' }
          },
          required: ['cost', 'justification']
        }
      },
      participant_travel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cost:         { type: 'number' },
            justification:{ type: 'string' }
          },
          required: ['cost', 'justification']
        }
      },
      subsistence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cost:         { type: 'number' },
            justification:{ type: 'string' }
          },
          required: ['cost', 'justification']
        }
      },
      participant_other: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cost:         { type: 'number' },
            justification:{ type: 'string' }
          },
          required: ['cost', 'justification']
        }
      },
      participant_support_has_data: { type: 'boolean' },
      materials_supplies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category_name:          { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['category_name', 'cost', 'narrative_justification']
        }
      },
      publications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            publication_title_or_type:{ type: 'string' },
            cost:                     { type: 'number' },
            narrative_justification:  { type: 'string' }
          },
          required: ['publication_title_or_type', 'cost', 'narrative_justification']
        }
      },
      consultants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            consultant_name:        { type: 'string' },
            cost:                   { type: 'number' },
            expertise_area:         { type: 'string' },
            rate:                   { type: 'number' },
            days:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['consultant_name', 'cost', 'expertise_area', 'rate', 'days', 'narrative_justification']
        }
      },
      computer_services: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            service_description:    { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['service_description', 'cost', 'narrative_justification']
        }
      },
      subawards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            institution_name:       { type: 'string' },
            cost:                   { type: 'number' },
            sub_pi:                 { type: 'string' },
            narrative_justification:{ type: 'string' }
          },
          required: ['institution_name', 'cost', 'sub_pi', 'narrative_justification']
        }
      },
      other_direct_lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name:              { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['item_name', 'cost', 'narrative_justification']
        }
      },
      fringe_total_cost:   { type: 'number' },
      indirect_total_cost: { type: 'number' }
    },
    required: ['senior_personnel', 'other_personnel', 'equipment', 'domestic_travel', 'foreign_travel',
               'participant_support_has_data', 'materials_supplies', 'other_direct_lines',
               'fringe_total_cost', 'indirect_total_cost']
  },

  'nih-detailed': {
    type: 'object',
    properties: {
      senior_personnel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:                   { type: 'string' },
            role:                   { type: 'string' },
            effort_months:          { type: 'string' },
            salary:                 { type: 'number' },
            narrative_description:  { type: 'string' }
          },
          required: ['name', 'role', 'effort_months', 'salary', 'narrative_description']
        }
      },
      other_personnel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name_or_title:          { type: 'string' },
            role:                   { type: 'string' },
            effort_months:          { type: 'string' },
            salary:                 { type: 'number' },
            narrative_description:  { type: 'string' }
          },
          required: ['name_or_title', 'role', 'effort_months', 'salary', 'narrative_description']
        }
      },
      equipment: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name:              { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['item_name', 'cost', 'narrative_justification']
        }
      },
      travel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            travel_type:            { type: 'string' },
            cost:                   { type: 'number' },
            num_people:             { type: 'number' },
            destination:            { type: 'string' },
            trip_purpose:           { type: 'string' },
            narrative_justification:{ type: 'string' }
          },
          required: ['travel_type', 'cost', 'num_people', 'destination', 'trip_purpose', 'narrative_justification']
        }
      },
      trainee_support: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category:               { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['category', 'cost', 'narrative_justification']
        }
      },
      materials_supplies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category_name:          { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['category_name', 'cost', 'narrative_justification']
        }
      },
      publications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type:                   { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['type', 'cost', 'narrative_justification']
        }
      },
      consultants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            consultant_name:        { type: 'string' },
            cost:                   { type: 'number' },
            expertise_area:         { type: 'string' },
            narrative_justification:{ type: 'string' }
          },
          required: ['consultant_name', 'cost', 'expertise_area', 'narrative_justification']
        }
      },
      consortiums: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            institution_name: { type: 'string' },
            total_cost:       { type: 'number' },
            direct_costs:     { type: 'number' },
            indirect_costs:   { type: 'number' },
            sub_pi:           { type: 'string' }
          },
          required: ['institution_name', 'total_cost', 'direct_costs', 'indirect_costs', 'sub_pi']
        }
      },
      user_fees: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            facility_name:          { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['facility_name', 'cost', 'narrative_justification']
        }
      },
      alterations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description:            { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['description', 'cost', 'narrative_justification']
        }
      },
      other_direct_lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name:              { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['item_name', 'cost', 'narrative_justification']
        }
      },
      fringe_total_cost:   { type: 'number' },
      indirect_total_cost: { type: 'number' }
    },
    required: ['senior_personnel', 'other_personnel', 'equipment', 'travel',
               'materials_supplies', 'other_direct_lines',
               'fringe_total_cost', 'indirect_total_cost']
  },

  'nih-modular': {
    type: 'object',
    properties: {
      personnel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:                  { type: 'string' },
            role:                  { type: 'string' },
            effort_months:         { type: 'string' },
            narrative_description: { type: 'string' }
          },
          required: ['name', 'role', 'effort_months', 'narrative_description']
        }
      },
      consortium: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            institution_name:          { type: 'string' },
            institution_location_type: { type: 'string' },
            effort_months:             { type: 'string' },
            sub_personnel_name:        { type: 'string' },
            sub_role:                  { type: 'string' },
            narrative_description:     { type: 'string' }
          },
          required: ['institution_name', 'institution_location_type', 'effort_months',
                     'sub_personnel_name', 'sub_role', 'narrative_description']
        }
      },
      additional_justification: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            variation_explanation: { type: 'string' }
          },
          required: ['variation_explanation']
        }
      },
      fringe_total_cost:   { type: 'number' },
      indirect_total_cost: { type: 'number' }
    },
    required: ['personnel', 'consortium', 'additional_justification',
               'fringe_total_cost', 'indirect_total_cost']
  },

  'generic': {
    type: 'object',
    properties: {
      personnel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:                  { type: 'string' },
            role:                  { type: 'string' },
            effort_months:         { type: 'string' },
            salary:                { type: 'number' },
            narrative_description: { type: 'string' }
          },
          required: ['name', 'role', 'effort_months', 'salary', 'narrative_description']
        }
      },
      equipment: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name:              { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['item_name', 'cost', 'narrative_justification']
        }
      },
      travel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            destination:            { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['destination', 'cost', 'narrative_justification']
        }
      },
      direct_costs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category_or_item:       { type: 'string' },
            cost:                   { type: 'number' },
            narrative_justification:{ type: 'string' }
          },
          required: ['category_or_item', 'cost', 'narrative_justification']
        }
      },
      fringe_total_cost:   { type: 'number' },
      indirect_total_cost: { type: 'number' }
    },
    required: ['personnel', 'equipment', 'travel', 'direct_costs',
               'fringe_total_cost', 'indirect_total_cost']
  }

};
