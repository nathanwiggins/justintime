const Parser = (() => {

  function extractSourceTruth(rows) {
    const truth    = {};
    const keywords = ['total', 'subtotal', 'grand total', 'sum'];

    rows.forEach(row => {
      const values = Object.values(row);

      const label = values.find(v =>
        typeof v === 'string' &&
        keywords.some(kw => v.toLowerCase().includes(kw))
      );

      if (!label) return;

      const numbers = values.filter(v => typeof v === 'number' && v > 0);
      if (numbers.length === 0) return;

      const amount = Math.max(...numbers);
      const key    = label.toString().trim().toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');

      truth[key] = amount;
    });

    return truth;
  }

  function detectNumYears(aoa) {
    for (const row of aoa) {
      const count = row.filter(cell =>
        /^(year|yr|fy|y)\s*\d+$/i.test(String(cell).trim())
      ).length;
      if (count > 0) return count;
    }
    return 0;
  }

  function parse(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb   = XLSX.read(data, { type: 'array' });

          const csvParts    = [];
          const allJsonRows = [];
          let   numYears    = 0;

          wb.SheetNames.forEach(name => {
            const sheet    = wb.Sheets[name];
            const aoa      = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            const filtered = aoa.filter(row =>
              row.some(cell => cell !== '' && cell !== null && cell !== undefined)
            );

            csvParts.push(`\n\n--- SHEET: ${name} ---\n` + filtered.map(row => row.join('\t')).join('\n'));

            const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            allJsonRows.push(...jsonRows);

            const sheetYears = detectNumYears(aoa);
            if (sheetYears > numYears) numYears = sheetYears;
          });

          const csvText     = csvParts.join('');
          const sourceTruth = extractSourceTruth(allJsonRows);

          resolve({ csvText, sourceTruth, numYears });
        } catch (err) {
          reject(new Error('Failed to parse budget file: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  return { parse };
})();
