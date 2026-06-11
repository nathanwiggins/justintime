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

  let retryHandler = null;

  async function withRetry(fn) {
    let lastError;
    for (let i = 0; i < 3; i++) {
      try { return await fn(); } catch (err) {
        lastError = err;
        if (i < 2) {
          const delaySecs = Math.pow(2, i);
          if (retryHandler) retryHandler(`${err.message}, retrying in ${delaySecs}s…`);
          await new Promise(r => setTimeout(r, delaySecs * 1000));
          if (retryHandler) retryHandler(null);
        }
      }
    }
    throw lastError;
  }

  async function callApi(apiKey, prompt, schema) {
    return withRetry(async () => {
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
    });
  }

  async function generateSection({ csvText, projectSummary, templateType, apiKey, section, additionalContext }) {
    const prompt  = buildSectionPrompt(csvText, projectSummary, templateType, section, additionalContext);
    const result  = await callApi(apiKey, prompt, section.schema);
    return { result, prompt };
  }

  function reconcileLabeled(preExtracted, labeled) {
    return preExtracted.map((pre, i) => {
      if (labeled[i] && labeled[i].value === pre.value) return labeled[i];
      const match = labeled.find(l => l.value === pre.value && l.context === pre.context);
      return match || { label: pre.context, value: pre.value, context: pre.context };
    });
  }

  async function extractValues(preExtracted, justificationText, apiKey) {
    const prompt = `You are a precise data labeling assistant. Below is a list of ${preExtracted.length} dollar values extracted from a budget justification document, each paired with the sentence in which it appears.

Your only task is to add a descriptive label to each item. The label should clearly identify what the value represents (e.g. "Dr. Smith Year 1 Salary", "Equipment: Spectrometer", "Total Indirect Costs Year 2").

Rules:
- Return exactly ${preExtracted.length} objects — one per input item, in the same order
- Copy value and context exactly as given — do not modify them
- Write a label that is specific and descriptive
- Use the context sentence and the full budget justification below to inform each label

Extracted values:
${JSON.stringify(preExtracted, null, 2)}

Budget Justification:
${justificationText}`;
    const labeled = await callApi(apiKey, prompt, VerifierSchemas.extraction);
    return reconcileLabeled(preExtracted, labeled);
  }

  function reconcileMatched(extracted, matched) {
    return extracted.map((item, i) => {
      if (matched[i] && matched[i].label === item.label) return matched[i];
      const match = matched.find(m => m.label === item.label && m.justification_value === item.value);
      return match || { label: item.label, justification_value: item.value, found_in_spreadsheet: false };
    });
  }

  async function matchValues(extracted, csvText, apiKey) {
    const prompt = `You are a budget verification assistant. For each item in the list below, search the spreadsheet data to find the corresponding value.

Instructions:
- Return exactly ${extracted.length} objects — one per input item, in the same order
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
    const matched = await callApi(apiKey, prompt, VerifierSchemas.comparison);
    return reconcileMatched(extracted, matched);
  }

  async function auditResults(problemItems, justificationText, csvText, apiKey) {
    const prompt = `You are a senior budget audit assistant reviewing discrepancies between a budget justification document and its corresponding spreadsheet.

You have been given a list of problem items — values that either could not be found in the spreadsheet, or were found but do not match.

Your tasks:

1. For each NOT_FOUND item, determine 
   - Whether this value is a calculated sum derivable from other values in the spreadsheet. A value is calculated if you can identify individual component lines (e.g. year-by-year salary rows) in the spreadsheet that add up to it. If it is a calculated sum, omit it from your output entirely — it is not a true discrepancy.
   - Whether this value is actually a mismatch and was classified as NOT_FOUND by mistake. If so, assign it a status of MISMATCH.

2. For each MISMATCH item, analyze the full set of findings together to identify the relationships:
   - A ROOT_CAUSE mismatch is one where the incorrect value is an atomic entry — a rate, a unit cost, or a year-level amount that is not itself a sum of other mismatched items in this list.
   - A CASCADING mismatch is one that is off only because it rolls up or derives from a ROOT_CAUSE mismatch.
   - Set cause_type to ROOT_CAUSE or CASCADING for MISMATCH items only. Omit cause_type for NOT_FOUND items.
   - For CASCADING items, also set root_cause_label to the exact label string of the ROOT_CAUSE finding it derives from.

3. For each remaining item include:
   - label: copied exactly from the input
   - justification_value: copied exactly from the input
   - spreadsheet_value: the spreadsheet value if one was found (omit if truly not present)
   - status: MISMATCH if a corresponding value was found in both sources but the numbers conflict, NOT_FOUND if no match exists and it cannot be derived from spreadsheet components
   - cause_type: ROOT_CAUSE or CASCADING for MISMATCH items only (omit for NOT_FOUND)

4. If there are no meaningful mismatches or values not found, return an empty array.

Problem items:
${JSON.stringify(problemItems, null, 2)}

Budget Justification:
${justificationText}

Budget Spreadsheet:
${csvText}`;
    return callApi(apiKey, prompt, VerifierSchemas.audit);
  }

  async function auditNotFound(notFoundItems, justificationText, csvText, apiKey) {
    const prompt = `You are a budget verification assistant. For each item in the list below, perform the following two tasks:

1. Search the spreadsheet data to find the corresponding value
   - Match by meaning, not just text — "Dr. Smith Year 1 Salary" may correspond to "PI Salary Y1" in the spreadsheet
   - Spreadsheet cells may contain values embedded in strings (e.g. "John Smith ($108,000 IBS)") — extract the numeric value from the string when that is the relevant figure
   - Set found_in_spreadsheet to true if you can identify a matching line in the spreadsheet
   - If found, set spreadsheet_value to the numeric value from the spreadsheet as a plain number
   - If not found or too ambiguous to match confidently, set found_in_spreadsheet to false and omit spreadsheet_value

2. If you cannot find the item in the spreadsheet, use the budget justification to determine whether this value is a calculated sum of other values that are in the spreadsheet
   - A value is calculated if you can identify individual component lines in the spreadsheet whose values add up to it
   - If it is calculated, set calculated_in_spreadsheet to true and list the spreadsheet component descriptions in spreadsheet_components
   - If it is neither found nor calculated, set both found_in_spreadsheet and calculated_in_spreadsheet to false

Return exactly ${notFoundItems.length} objects — one per input item, in the same order.

For each item include:
- label: copied exactly from input
- justification_value: copied exactly from input
- context: copied exactly from input
- found_in_spreadsheet: true or false
- spreadsheet_value: the matched numeric value (even if it differs from justification_value) from the spreadsheet (only if found_in_spreadsheet is true)
- calculated_in_spreadsheet: true or false
- spreadsheet_components: list of spreadsheet line descriptions that sum to the value (only if calculated_in_spreadsheet is true)

Items:
${JSON.stringify(notFoundItems, null, 2)}

Budget Justification:
${justificationText}

Budget Spreadsheet:
${csvText}`;
    return callApi(apiKey, prompt, VerifierSchemas.notFoundAudit);
  }

  async function auditMismatches(mismatchItems, justificationText, csvText, apiKey) {
    const prompt = `You are a senior budget audit assistant. You have been given a list of mismatches between a budget justification document and a budget spreadsheet — values that appear in both sources but do not agree numerically.

Your task is to analyze all mismatches together and group them by root cause.

Instructions:
- A root cause is a single underlying error (e.g. a wrong salary rate, an incorrect fringe rate, a miscalculated subtotal) that explains one or more of the mismatches.
- Group all mismatches that share the same root cause together.
- Assign each group a mismatch_label — a brief phrase describing the root cause (e.g. "Incorrect PI salary rate Year 2", "Fringe benefit rate applied to wrong base").
- A mismatch with no clear relationship to any other may be its own group of one.
- Every input item must appear in exactly one group.

For each group return:
- mismatch_label: brief description of the root cause
- items: the mismatch items in this group, each with label, justification_value, spreadsheet_value, and context copied exactly from the input

Mismatch items:
${JSON.stringify(mismatchItems, null, 2)}

Budget Justification:
${justificationText}

Budget Spreadsheet:
${csvText}`;
    return callApi(apiKey, prompt, VerifierSchemas.mismatchAudit);
  }

  async function sendRaw(apiKey, prompt) {
    const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Gemini API error (HTTP ${response.status})`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini returned an empty response.');
    return rawText;
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

  return { generateSection, extractValues, matchValues, auditResults, auditNotFound, auditMismatches, test, sendRaw, setRetryHandler: cb => { retryHandler = cb; } };
})();
