const Api = (() => {
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

  function globalRules(templateType) {
    let rules = `- All dollar amounts must match the budget spreadsheet exactly
- Write professional, concise narrative justifications for each line item
- If a budget category has no line items, return an empty array for that field
- If the spreadsheet contains multi-year budgets, sum the costs cumulatively across all years. However, for personnel effort, state the annual effort (e.g., '1 summer month' or '12 calendar months') rather than a cumulative effort total
- Extract the total cumulative Fringe Benefits cost and the total cumulative Indirect (F&A) cost into the fringe_total_cost and indirect_total_cost fields. Do not list Indirect Costs or Fringe Benefits under 'Other Direct Costs'`;

    if (templateType === 'nih-modular') {
      rules += `\n\nCRITICAL MODULAR RULE: Do NOT include any dollar amounts, salary figures, fringe rates, or cost totals anywhere in your response. NIH Modular guidelines strictly prohibit specific dollar figures in the personnel justification. Only describe names, roles, and effort in calendar person-months.`;
    }
    if (templateType === 'nih-detailed') {
      rules += `\n\nCRITICAL NIH RULE: Effort must be described using "person months" (Calendar, Academic, or Summer). Percentage effort is obsolete and must never be used. If a subaward exists, its direct AND indirect costs must be clearly noted.`;
    }
    if (templateType === 'nsf') {
      rules += `\n\nNSF RULE: Separate all travel into domestic (E.1) and foreign (E.2) arrays. Separate all participant support costs from general direct costs. Set participant_support_has_data to true only if the budget contains participant support line items.`;
    }

    return rules;
  }

  function buildPrompt(csvText, projectSummary, templateType) {
    return `You are an expert grants administrator writing a formal budget justification narrative.

Using the budget spreadsheet data and project summary provided below, generate a structured JSON response that fills out every section of a ${templateType.toUpperCase()} budget justification.

Requirements:
${globalRules(templateType)}

Project Summary:
${projectSummary}

Budget Spreadsheet Data:
${csvText}`;
  }

  function buildSectionPrompt(csvText, projectSummary, templateType, section) {
    return `You are an expert grants administrator writing a formal budget justification narrative.

You are generating ONLY the "${section.label}" section of a ${templateType.toUpperCase()} budget justification.

Global requirements:
${globalRules(templateType)}

Section-specific instructions:
${section.prompt}

Project Summary:
${projectSummary}

Budget Spreadsheet Data:
${csvText}`;
  }

  async function callApi(apiKey, prompt, schema) {
    const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Gemini API error (HTTP ${response.status})`);
    }

    const data    = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini returned an empty response.');

    return JSON.parse(rawText);
  }

  async function generate({ csvText, projectSummary, templateType, apiKey }) {
    const schema = Schemas[templateType];
    if (!schema) throw new Error(`No schema defined for template type: ${templateType}`);

    const prompt = buildPrompt(csvText, projectSummary, templateType);
    const json   = await callApi(apiKey, prompt, schema);

    return { json, prompt };
  }

  async function generateSection({ csvText, projectSummary, templateType, apiKey, section }) {
    const prompt  = buildSectionPrompt(csvText, projectSummary, templateType, section);
    const result  = await callApi(apiKey, prompt, section.schema);
    return { result, prompt };
  }

  async function test(apiKey) {
    const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with only the word OK.' }] }]
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Connected but received no content. Check API key permissions.');
    }
  }

  return { generate, generateSection, test };
})();
