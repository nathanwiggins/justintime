const Extractor = (() => {
  const DOLLAR_REGEX = /\$[\d,]+(?:\.\d{2})?/g;

  function extractSentence(text, matchStart) {
    const lineStart = text.lastIndexOf('\n', matchStart - 1) + 1;
    let lineEnd = text.indexOf('\n', matchStart);
    if (lineEnd === -1) lineEnd = text.length;
    return text.slice(lineStart, lineEnd).trim();
  }

  function parseValue(raw) {
    return parseFloat(raw.replace(/[$,]/g, ''));
  }

  function run(text) {
    const results = [];
    DOLLAR_REGEX.lastIndex = 0;
    let match;
    while ((match = DOLLAR_REGEX.exec(text)) !== null) {
      results.push({
        value: parseValue(match[0]),
        context: extractSentence(text, match.index)
      });
    }
    return results;
  }

  return { run };
})();
