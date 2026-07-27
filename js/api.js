const Api = (() => {
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

  const isVandalizerHosted = () => window.JIT_GLOBAL_CONFIG?.useVandalizerProxy || false;

  function getCsrfToken() {
    const hostMatch = document.cookie.match(/(?:^|;\s*)__Host-csrf_token=([^;]+)/);
    if (hostMatch) return decodeURIComponent(hostMatch[1]);
    const legacyMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return legacyMatch ? decodeURIComponent(legacyMatch[1]) : null;
  }

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

  async function callApi(apiKey, prompt, schema, systemPrompt = null) {
    return withRetry(async () => {
      if (isVandalizerHosted()) {
        const csrfToken = getCsrfToken();
        const response = await fetch('/api/apps/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
          },
          body: JSON.stringify({ prompt, system_prompt: systemPrompt, schema_def: schema })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Vandalizer API error (HTTP ${response.status})`);
        }
        const result = await response.json();
        return result.data;
      }

      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      };
      if (schema) {
        payload.generationConfig = { responseMimeType: 'application/json', responseSchema: schema };
      }
      if (systemPrompt) {
        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error?.message || `Gemini API error (HTTP ${response.status})`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Gemini returned an empty response.');
      return schema ? JSON.parse(rawText) : rawText;
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

  async function extractValuesBatch(batchItems, justificationText, apiKey) {
    const prompt = `You are a precise data labeling assistant. Below is a list of ${batchItems.length} dollar values extracted from a budget justification document, each paired with the sentence in which it appears.

Your only task is to add a descriptive label to each item. The label should clearly identify what the value represents (e.g. "Dr. Smith Year 1 Salary", "Equipment: Spectrometer", "Total Indirect Costs Year 2").

Rules:
- Return exactly ${batchItems.length} objects — one per input item, in the same order
- Copy value and context exactly as given — do not modify them
- Write a label that is specific and descriptive
- Use the context sentence and the full budget justification below to inform each label

Extracted values:
${JSON.stringify(batchItems, null, 2)}

Budget Justification:
${justificationText}`;
    const labeled = await callApi(apiKey, prompt, VerifierSchemas.extraction);
    return reconcileLabeled(batchItems, labeled);
  }

  function reconcileMatched(extracted, matched) {
    return extracted.map((item, i) => {
      if (matched[i] && matched[i].label === item.label) return matched[i];
      const match = matched.find(m => m.label === item.label && m.justification_value === item.value);
      return match || { label: item.label, justification_value: item.value, found_in_spreadsheet: false };
    });
  }

  function deriveFoundInSpreadsheet(matched) {
    return matched.map(m => ({
      ...m,
      found_in_spreadsheet: m.spreadsheet_value !== undefined && m.spreadsheet_value !== null
    }));
  }

  async function matchValues(extracted, csvText, apiKey) {
    const prompt = `You are a budget verification assistant. For each item in the list below, search the spreadsheet data to find the corresponding value.

Instructions:
- Return exactly ${extracted.length} objects — one per input item, in the same order
- Copy label and justification_value exactly from the input (justification_value comes from the input's "value" field)
- If you can identify a matching line in the spreadsheet, set spreadsheet_value to the numeric value as a plain number
- If not found or too ambiguous to match confidently, omit spreadsheet_value entirely
- Match by meaning, not just text — "Dr. Smith Year 1 Salary" may correspond to "PI Salary Y1" in the spreadsheet
- Spreadsheet cells may contain values inside a string (e.g. "John Smith ($108,000 IBS)", "Graduate Students (x5)", etc.) — extract the numeric value from the string when that is the relevant figure

Items to match:
${JSON.stringify(extracted, null, 2)}

Budget Spreadsheet:
${csvText}`;
    const matched = await callApi(apiKey, prompt, VerifierSchemas.comparison);
    return reconcileMatched(extracted, deriveFoundInSpreadsheet(matched));
  }

  async function matchValuesBatch(batchItems, csvText, apiKey) {
    const prompt = `You are a budget verification assistant. For each item in the list below, search the spreadsheet data to find the corresponding value.

Instructions:
- Return exactly ${batchItems.length} objects — one per input item, in the same order
- Copy label and justification_value exactly from the input (justification_value comes from the input's "value" field)
- If you can identify a matching line in the spreadsheet, set spreadsheet_value to the numeric value as a plain number
- If not found or too ambiguous to match confidently, omit spreadsheet_value entirely
- Match by meaning, not just text — "Dr. Smith Year 1 Salary" may correspond to "PI Salary Y1" in the spreadsheet
- Spreadsheet cells may contain values inside a string (e.g. "John Smith ($108,000 IBS)", "Graduate Students (x5)", etc.) — extract the numeric value from the string when that is the relevant figure

Items to match:
${JSON.stringify(batchItems, null, 2)}

Budget Spreadsheet:
${csvText}`;
    const matched = await callApi(apiKey, prompt, VerifierSchemas.comparison);
    return reconcileMatched(batchItems, deriveFoundInSpreadsheet(matched));
  }

  async function auditNotFound(notFoundItems, justificationText, csvText, apiKey) {
    const strippedItems = notFoundItems.map(({ found_in_spreadsheet, ...rest }) => rest);
    const prompt = `You are a budget verification assistant analyzing a budget spreadsheet to search for values corresponding with specific labels. For each item in the list below, perform the following two tasks:

1. Search the spreadsheet data to find the corresponding value to the label
   - Match by meaning, not just text — "Dr. Smith Year 1 Salary" may correspond to "PI Salary Y1" in the spreadsheet
   - Spreadsheet cells may contain values embedded as notes in strings (e.g. "John Smith ($108,000 IBS)") — extract the numeric value from the string when that is the relevant figure
   - If found, set spreadsheet_value to the numeric value from the spreadsheet as a plain number
   - If not found or too ambiguous to match confidently, omit spreadsheet_value entirely

2. If you cannot find the item in the spreadsheet, use the budget justification to determine whether this value is a calculated sum of other values that are in the spreadsheet
   - A value is calculated if you can identify individual component lines in the spreadsheet whose values add up to it
   - If it is calculated, set calculated_in_spreadsheet to true and list the spreadsheet component descriptions in spreadsheet_components
   - If it is neither found nor calculated, set calculated_in_spreadsheet to false

Return exactly ${strippedItems.length} objects — one per input item, in the same order.

For each item include:
- label: copied exactly from input
- justification_value: copied exactly from input
- context: copied exactly from input
- spreadsheet_value: (only if found) the matched numeric value from the spreadsheet
- calculated_in_spreadsheet: true or false
- spreadsheet_components: (only if calculated_in_spreadsheet is true) list of spreadsheet line descriptions that sum to the value

Items:
${JSON.stringify(strippedItems, null, 2)}

Budget Justification:
${justificationText}

Budget Spreadsheet:
${csvText}`;
    const result = await callApi(apiKey, prompt, VerifierSchemas.notFoundAudit);
    return deriveFoundInSpreadsheet(result);
  }

  async function auditMismatches(mismatchItems, justificationText, csvText, apiKey) {
    const prompt = `You are a senior budget audit assistant analyzing a budget justification to ensure it agrees with the submitted budget. You have been given a list of mismatches between the budget justification document and the budget spreadsheet.

Your task is to analyze all the mismatches together and group them by root cause so that you can communicate to the user what values need to be updated in the budget justification.

Instructions:
- A root cause is a single underlying error (e.g. a wrong salary rate, an incorrect fringe rate, a miscalculated subtotal) that explains one or more of the mismatches.
- Group all mismatches that share the same root cause together.
- Assign each group a mismatch_label — a brief phrase describing the root cause (e.g. "Incorrect PI salary rate Year 2", "Fringe benefit rate applied to wrong base").
- A mismatch with no clear relationship to any other may be its own group of one.
- Every input item must appear in exactly one group.
- Prefer broader groupings — merge related root causes together so there are no more than about 4 groups total, even if that means combining several minor issues into one group, so the user isn't asked to review too many separate items.

For each group return:
- mismatch_label: brief description of the root cause
- items: the mismatch items in this group, each with label, justification_value, spreadsheet_value, and context copied exactly from the input

Mismatch items:
${JSON.stringify(mismatchItems, null, 2)}

Budget Justification:
${justificationText}

Budget Spreadsheet:
${csvText}`;
    const result = await callApi(apiKey, prompt, VerifierSchemas.mismatchAudit);
    return result.groups;
  }

  async function auditSummary(notFoundItems, mismatchGroups, justificationText, csvText, apiKey) {
    const prompt = `You are a grant budget reviewer generating a clear, human-readable summary of updates that need to be made to a budget justification.

You have been given two sets of findings from an audit of a budget justification document against its submitted budget spreadsheet:
1. Values that could not be easily found or accounted for in the spreadsheet
2. Groups of mismatched values between the budget and the budget justification, each grouped by root cause

Your task is to produce a summary that explains the findings to the user so that they know what edits they need to make to the budget justification.

Instructions:
- For the NOT_FOUND items (if any), create ONE section containing all of them with a clear section_label and a short, neutral explanation of what values were not detected and the uncertainty that creates. Do not tell the user what to do about it — that language is only added later, once a human confirms it's a real concern.
- For each mismatch group (if any), create ONE section with a fresh, descriptive section_label and a short, neutral explanation of what differs between the justification and the spreadsheet. State the observed discrepancy only — do not prescribe a fix, judge severity, or say what "needs" to change. That language is only added later, once a human confirms it's a real issue.
- Keep each explanation to 1-2 short sentences, but name the specific conflicting figures (e.g. "the justification states $1,908 while the spreadsheet shows $6,588") so the discrepancy is concrete rather than vague — citing numbers is still neutral, it's only judgment and prescribed fixes that come later.
- Omit any section that has no items. Return an empty array if there are no findings at all.
- Set type to "not_found" for the NOT_FOUND section and "mismatch" for each mismatch section.
- Explanations should be written in plain language for a research administrator.

NOT_FOUND items:
${JSON.stringify(notFoundItems, null, 2)}

Mismatch groups:
${JSON.stringify(mismatchGroups, null, 2)}

Budget Justification:
${justificationText}

Budget Spreadsheet:
${csvText}`;
    return callApi(apiKey, prompt, VerifierSchemas.summaryAudit);
  }

  async function classifyReply(section, transcript, priorSections, justificationText, csvText, apiKey) {
    const conversation = transcript.map(turn => `${turn.role === 'assistant' ? 'Assistant' : 'User'}: ${turn.text}`).join('\n');
    const priorFindings = (priorSections || []).filter(s => s.resolution).map(s =>
      `- ${s.section_label}: ${s.resolution}`
    ).join('\n');

    const prompt = `You are a friendly budget audit assistant discussing one suspected discrepancy with a research administrator. You are verifying, together with the user, whether this is a real mismatch that needs fixing in the budget justification, or something that turns out not to be a concern (e.g. the user has context that explains it, or you misread the documents).

Finding:
- Label: ${section.section_label}
- Type: ${section.type}
- Explanation: ${section.explanation}
- Items: ${JSON.stringify(section.items, null, 2)}
${priorFindings ? `\nEarlier findings already resolved in this same review (the user may reference these by name or number — use this to understand what they mean):\n${priorFindings}\n` : ''}
Conversation so far:
${conversation}

Budget Justification:
${justificationText}

Budget Spreadsheet:
${csvText}

Instructions:
- Use the budget justification and spreadsheet above to check the user's claims when they push back or offer an explanation — don't just take their word for it if the documents say otherwise. If a claim conflicts with what the source text actually says, point that out rather than accepting it.
- Respond with a short, plain-language assistant_reply continuing the conversation naturally (acknowledge what the user said). This is a live chat message, so it can be conversational. Your role is only to identify whether this is a real issue or not — do not offer to draft, write, or produce corrected text for the justification yourself.
- Default to closing the conversation (needs_followup: false) and treating this as a real issue. Only keep needs_followup true when the user's latest reply is a genuine question, or gives new context/information that helps clarify or explain the discrepancy and warrants a response before this can be resolved. If the user's latest reply states or clearly implies this isn't actually a problem, close the conversation with tag "not_a_concern" instead. In every other case — including a simple acknowledgement or agreement — close the conversation and mark it a real issue rather than asking the user to confirm again. The user should be the one driving whether the conversation continues, not the assistant.
- When you set needs_followup to false, also fill resolution_summary. This is NOT a chat reply — it's a standalone paragraph that will replace this conversation in a written report, so it must make sense on its own with no reference to "you said," "thanks for confirming," or "the user." Write it as a factual statement about the documents themselves — what the justification states, what the spreadsheet shows, and what should change (or why no change is needed) — folding in any clarifying information surfaced during the conversation without attributing it to a person. State the issue, the relevant context, and the fix or next step in a clear, professional tone. Leave resolution_summary as an empty string while needs_followup is true.
- Set tag to "real_issue" if the finding still needs to be fixed in the budget justification, or "not_a_concern" if the explanation resolves it. Give your best-guess tag even when needs_followup is true.`;
    return callApi(apiKey, prompt, VerifierSchemas.chatReply);
  }

  async function test(apiKey) {
    if (isVandalizerHosted()) return;

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

  return {
    generateSection, extractValues, extractValuesBatch, matchValues, matchValuesBatch,
    auditNotFound, auditMismatches, auditSummary, classifyReply, test, isVandalizerHosted,
    setRetryHandler: cb => { retryHandler = cb; }
  };
})();
