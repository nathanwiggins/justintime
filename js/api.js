const Api = (() => {
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

  function buildPrompt(csvText, projectSummary, templateType) {
    let instructions = `You are an expert grants administrator writing a formal budget justification narrative.

Using the budget spreadsheet data and project summary provided below, generate a structured JSON response that fills out every section of a ${templateType.toUpperCase()} budget justification.

Requirements:
- All dollar amounts must match the budget spreadsheet exactly
- Write professional, concise narrative justifications for each line item
- If a budget category has no line items, return an empty array for that field`;

    if (templateType === 'nih-modular') {
      instructions += `

CRITICAL MODULAR RULE: Do NOT include any dollar amounts, salary figures, fringe rates, or cost totals anywhere in your response. NIH Modular guidelines strictly prohibit specific dollar figures in the personnel justification. Only describe names, roles, and effort in calendar person-months.`;
    }

    if (templateType === 'nih-detailed') {
      instructions += `

CRITICAL NIH RULE: Effort must be described using "person months" (Calendar, Academic, or Summer). Percentage effort is obsolete and must never be used. If a subaward exists, its direct AND indirect costs must be clearly noted.`;
    }

    if (templateType === 'nsf') {
      instructions += `

NSF RULE: Separate all travel into domestic (E.1) and foreign (E.2) arrays. Separate all participant support costs from general direct costs. Set participant_support_has_data to true only if the budget contains participant support line items.`;
    }

    return `${instructions}

Project Summary:
${projectSummary}

Budget Spreadsheet Data:
${csvText}`;
  }

  async function generate({ csvText, projectSummary, templateType, apiKey }) {
    const schema = Schemas[templateType];
    if (!schema) throw new Error(`No schema defined for template type: ${templateType}`);

    const prompt   = buildPrompt(csvText, projectSummary, templateType);
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

  return { generate };
})();
