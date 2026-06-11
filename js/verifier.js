const Verifier = (() => {
  async function run(justificationText, csvText, apiKey) {
    const preExtracted = Extractor.run(justificationText);
    const extracted    = await Api.extractValues(preExtracted, justificationText, apiKey);
    const comparison   = await Api.matchValues(extracted, csvText, apiKey);
    return comparison;
  }

  return { run };
})();
