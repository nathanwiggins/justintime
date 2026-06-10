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

  async function auditResults(problemItems, justificationText, csvText, apiKey) {
    const prompt = `You are a senior budget audit assistant reviewing discrepancies between a budget justification document and its corresponding spreadsheet.

You have been given a list of problem items — values that either could not be found in the spreadsheet, or were found but do not match.

Your tasks:

1. For each NOT_FOUND item: determine whether this value is a calculated sum derivable from other values in the spreadsheet. A value is calculated if you can identify individual component lines (e.g. year-by-year salary rows) in the spreadsheet that add up to it. If it is a calculated sum, omit it from your output entirely — it is not a true discrepancy.

2. For each remaining item, analyze the full set of findings together to identify causal relationships:
   - A ROOT_CAUSE finding is one where the incorrect value is an atomic entry — a rate, a unit cost, or a year-level amount that is not itself a sum of other mismatched items in this list. This is where the actual discrepancy originates.
   - A CASCADING finding is one that is off only because it rolls up or derives from a ROOT_CAUSE finding. For example, if a consultant rate changed, then the consultant year total, the consultant total, and the category total are all cascading effects of that one root cause.

3. For each remaining item include:
   - label: copied exactly from the input
   - justification_value: copied exactly from the input
   - spreadsheet_value: the spreadsheet value if one was found (omit if truly not present)
   - status: MISMATCH if a corresponding value was found in both sources but the numbers conflict, NOT_FOUND if no match exists and it cannot be derived from spreadsheet components
   - cause_type: ROOT_CAUSE or CASCADING
   - explanation: a plain-language sentence for a research administrator. For ROOT_CAUSE items, explain what the discrepancy is. For CASCADING items, name the root cause explicitly — e.g. "This total is off because it includes [root cause label], where the justification value differs from the spreadsheet."

Problem items:
${JSON.stringify(problemItems, null, 2)}

Budget Justification:
${justificationText}

Budget Spreadsheet:
${csvText}`;
    return callApi(apiKey, prompt, VerifierSchemas.audit);
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

  return { generateSection, extractValues, matchValues, auditResults, test };
})();
