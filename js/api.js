const Api = (() => {
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

  function globalRules() {
    return `- All dollar amounts must match the budget spreadsheet exactly
- Write professional, informative narrative justifications for each line item
- Prioritize JUSTIFYING and making a compelling case to the sponsor WHY each budget request is really necessary
- If a budget category has no line items, return an empty array for that field`;
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

  async function generateSection({ csvText, projectSummary, templateType, apiKey, section, additionalContext }) {
    const prompt  = buildSectionPrompt(csvText, projectSummary, templateType, section, additionalContext);
    const result  = await callApi(apiKey, prompt, section.schema);
    return { result, prompt };
  }

  async function extractValues(justificationText, apiKey) {
    const prompt = `You are a precise data extraction tool. Read this budget justification document and identify every numeric dollar value mentioned.

For each value provide:
- label: a descriptive identifier for what the value represents (e.g. "Dr. Smith Year 1 Salary", "Equipment: Spectrometer", "Total Indirect Costs")
- value: the numeric amount as a plain number with no dollar signs or commas
- context: a short phrase or sentence from the document where this value appears

Extract ALL dollar amounts — individual line items, per-unit costs, yearly breakdowns, subtotals, and totals.

Budget Justification:
${justificationText}`;
    return callApi(apiKey, prompt, VerifierSchemas.extraction);
  }

  async function matchValues(extracted, csvText, apiKey) {
    const prompt = `You are a budget verification assistant. For each item in the list below, search the spreadsheet data to find the corresponding value.

Instructions:
- Copy label and justification_value exactly from the input (justification_value comes from the input's "value" field)
- Set found_in_spreadsheet to true if you can identify a matching line in the spreadsheet
- If found, set spreadsheet_value to the numeric value from the spreadsheet as a plain number
- If not found or too ambiguous to match confidently, set found_in_spreadsheet to false and omit spreadsheet_value
- Match by meaning, not just text — "Dr. Smith Year 1 Salary" may correspond to "PI Salary Y1" in the spreadsheet
- Spreadsheet cells may contain values inside a string (e.g. "John Smith ($108,000 IBS)", "Graduate Students (x5)", etc.) — extract the numeric value from the string when that is the relevant figure

Items to match:
${JSON.stringify(extracted, null, 2)}

Budget Spreadsheet:
${csvText}`;
    return callApi(apiKey, prompt, VerifierSchemas.comparison);
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

  return { generateSection, extractValues, matchValues, test };
})();
