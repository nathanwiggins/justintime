const Verifier = (() => {
  async function run(justificationText, csvText, apiKey) {
    const extracted  = await Api.extractValues(justificationText, apiKey);
    const comparison = await Api.matchValues(extracted, csvText, apiKey);
    return comparison;
  }

  return { run };
})();
