const Api = (() => {
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

  function globalRules() {
    return `- All dollar amounts must match the budget spreadsheet exactly
- Write professional, informative narrative justifications for each line item
- Prioritize JUSTIFYING and making a compelling case to the sponsor WHY each budget request is really necessary
- If a budget category has no line items, return an empty array for that field`;
  }

  function buildPrompt(csvText, projectSummary, templateType) {
    return `You are an expert grants administrator writing a formal budget justification narrative.

Using the budget spreadsheet data and project summary provided below, generate a structured JSON response that fills out every section of a ${templateType.toUpperCase()} budget justification.

Requirements:
${globalRules()}

Project Summary:
${projectSummary}

Budget Spreadsheet Data:
${csvText}`;
  }

  function buildSectionPrompt(csvText, projectSummary, templateType, section, additionalContext) {
    let prompt = `You are an expert grants administrator writing a formal budget justification narrative.

You are generating ONLY the "${section.label}" section of a ${templateType.toUpperCase()} budget justification.

Global requirements:
${globalRules()}

Section-specific instructions:
${section.prompt}`;

    if (additionalContext) {
      prompt += `\n\nInstitutional Context (incorporate the specific rates, policies, and language from this information directly into your response):\n${additionalContext}`;
    }

    prompt += `\n\nProject Summary:\n${projectSummary}\n\nBudget Spreadsheet Data:\n${csvText}`;

    return prompt;
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

  async function generateSection({ csvText, projectSummary, templateType, apiKey, section, additionalContext }) {
    const prompt  = buildSectionPrompt(csvText, projectSummary, templateType, section, additionalContext);
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
