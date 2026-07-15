const Schemas = {

  'nsf': {
    type: 'object',
    properties: {
      senior_personnel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:                  { type: 'string' },
            role:                  { type: 'string' },
            effort_months_per_year:         { type: 'number' },
            effort_type:           { type: 'string' },
            base_salary:           { type: 'number' },
            yearly_breakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  year: { type: 'number' },
                  cost: { type: 'number' }
                },
                required: ['year', 'cost']
              }
            },
            total_salary:          { type: 'number' },
            narrative_description: { type: 'string' },
            escalation_note:       { type: 'string' }
          },
          required: ['name', 'role', 'effort_months_per_year', 'effort_type', 'base_salary', 'yearly_breakdown', 'total_salary', 'narrative_description', 'escalation_note']
        }
      },
      other_personnel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            role:                  { type: 'string' },
            number_of_individuals: { type: 'number' },
            rate_type:             { type: 'string' },
            rate_amount:           { type: 'number' },
            effort_description:    { type: 'string' },
            yearly_breakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  year: { type: 'number' },
                  cost: { type: 'number' }
                },
                required: ['year', 'cost']
              }
            },
            total_cost:            { type: 'number' },
            narrative_description: { type: 'string' },
            escalation_note:       { type: 'string' }
          },
          required: ['role', 'number_of_individuals', 'rate_type', 'rate_amount',
                     'effort_description', 'yearly_breakdown', 'total_cost', 'narrative_description', 'escalation_note']
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
            yearly_breakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  year: { type: 'number' },
                  cost: { type: 'number' }
                },
                required: ['year', 'cost']
              }
            },
            narrative_justification:{ type: 'string' }
          },
          required: ['trip_purpose', 'destination', 'num_people', 'event_name', 'cost', 'yearly_breakdown', 'narrative_justification']
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
            yearly_breakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  year: { type: 'number' },
                  cost: { type: 'number' }
                },
                required: ['year', 'cost']
              }
            },
            narrative_justification:{ type: 'string' }
          },
          required: ['trip_purpose', 'destination', 'num_people', 'event_name', 'cost', 'yearly_breakdown', 'narrative_justification']
        }
      },
      stipends: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            num_participants: { type: 'number' },
            cost:             { type: 'number' },
            yearly_breakdown: {
              type: 'array',
              items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] }
            },
            justification:    { type: 'string' }
          },
          required: ['num_participants', 'cost', 'yearly_breakdown', 'justification']
        }
      },
      participant_travel: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            num_participants: { type: 'number' },
            cost:             { type: 'number' },
            yearly_breakdown: {
              type: 'array',
              items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] }
            },
            justification:    { type: 'string' }
          },
          required: ['num_participants', 'cost', 'yearly_breakdown', 'justification']
        }
      },
      subsistence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            num_participants: { type: 'number' },
            cost:             { type: 'number' },
            yearly_breakdown: {
              type: 'array',
              items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] }
            },
            justification:    { type: 'string' }
          },
          required: ['num_participants', 'cost', 'yearly_breakdown', 'justification']
        }
      },
      participant_other: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            num_participants: { type: 'number' },
            cost:             { type: 'number' },
            yearly_breakdown: {
              type: 'array',
              items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] }
            },
            justification:    { type: 'string' }
          },
          required: ['num_participants', 'cost', 'yearly_breakdown', 'justification']
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
            yearly_breakdown: { type: 'array', items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] } },
            narrative_justification:{ type: 'string' }
          },
          required: ['category_name', 'cost', 'yearly_breakdown', 'narrative_justification']
        }
      },
      publications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            publication_title_or_type:{ type: 'string' },
            cost:                     { type: 'number' },
            yearly_breakdown: { type: 'array', items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] } },
            narrative_justification:  { type: 'string' }
          },
          required: ['publication_title_or_type', 'cost', 'yearly_breakdown', 'narrative_justification']
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
            yearly_breakdown: { type: 'array', items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] } },
            narrative_justification:{ type: 'string' }
          },
          required: ['consultant_name', 'cost', 'expertise_area', 'rate', 'days', 'yearly_breakdown', 'narrative_justification']
        }
      },
      computer_services: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            service_description:    { type: 'string' },
            cost:                   { type: 'number' },
            yearly_breakdown: { type: 'array', items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] } },
            narrative_justification:{ type: 'string' }
          },
          required: ['service_description', 'cost', 'yearly_breakdown', 'narrative_justification']
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
            yearly_breakdown: { type: 'array', items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] } },
            narrative_justification:{ type: 'string' }
          },
          required: ['institution_name', 'cost', 'sub_pi', 'yearly_breakdown', 'narrative_justification']
        }
      },
      other_direct_lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name:              { type: 'string' },
            cost:                   { type: 'number' },
            yearly_breakdown: { type: 'array', items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] } },
            narrative_justification:{ type: 'string' }
          },
          required: ['item_name', 'cost', 'yearly_breakdown', 'narrative_justification']
        }
      },
      fringe_benefits: {
        type: 'object',
        properties: {
          total_cost:            { type: 'number' },
          narrative_description: { type: 'string' },
          rate_groups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                personnel_category:       { type: 'string' },
                applied_rate_description: { type: 'string' },
                yearly_breakdown: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      year: { type: 'number' },
                      cost: { type: 'number' }
                    },
                    required: ['year', 'cost']
                  }
                },
                category_total: { type: 'number' }
              },
              required: ['personnel_category', 'applied_rate_description', 'yearly_breakdown', 'category_total']
            }
          }
        },
        required: ['total_cost', 'narrative_description', 'rate_groups']
      },
      indirect_costs: {
        type: 'object',
        properties: {
          total_cost:            { type: 'number' },
          narrative_description: { type: 'string' },
          yearly_breakdown: {
            type: 'array',
            items: { type: 'object', properties: { year: { type: 'number' }, cost: { type: 'number' } }, required: ['year', 'cost'] }
          }
        },
        required: ['total_cost', 'narrative_description', 'yearly_breakdown']
      }
    },
    required: ['senior_personnel', 'other_personnel', 'equipment', 'domestic_travel', 'foreign_travel',
               'participant_support_has_data', 'materials_supplies', 'other_direct_lines',
]
  },
};

const VerifierSchemas = {
  extraction: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        label:   { type: 'string' },
        value:   { type: 'number' },
        context: { type: 'string' }
      },
      required: ['label', 'value', 'context']
    }
  },
  comparison: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        label:               { type: 'string' },
        justification_value: { type: 'number' },
        spreadsheet_value:   { type: 'number' }
      },
      required: ['label', 'justification_value']
    }
  },
  summaryAudit: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        section_label: { type: 'string' },
        type:          { type: 'string', enum: ['not_found', 'mismatch'] },
        explanation:   { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label:               { type: 'string' },
              justification_value: { type: 'number' },
              spreadsheet_value:   { type: 'number' },
              context:             { type: 'string' }
            },
            required: ['label', 'justification_value']
          }
        }
      },
      required: ['section_label', 'type', 'explanation', 'items']
    }
  },
  mismatchAudit: {
    type: 'object',
    properties: {
      groups: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            mismatch_label: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label:               { type: 'string' },
                  justification_value: { type: 'number' },
                  spreadsheet_value:   { type: 'number' },
                  context:             { type: 'string' }
                },
                required: ['label', 'justification_value', 'spreadsheet_value']
              }
            }
          },
          required: ['mismatch_label', 'items']
        }
      }
    },
    required: ['groups']
  },
  notFoundAudit: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        label:                     { type: 'string' },
        justification_value:       { type: 'number' },
        context:                   { type: 'string' },
        spreadsheet_value:         { type: 'number' },
        calculated_in_spreadsheet: { type: 'boolean' },
        spreadsheet_components:    { type: 'array', items: { type: 'string' } }
      },
      required: ['label', 'justification_value', 'context', 'calculated_in_spreadsheet']
    }
  },
  chatReply: {
    type: 'object',
    properties: {
      assistant_reply: { type: 'string' },
      tag:             { type: 'string', enum: ['real_issue', 'not_a_concern'] },
      needs_followup:  { type: 'boolean' }
    },
    required: ['assistant_reply', 'tag', 'needs_followup']
  }
};