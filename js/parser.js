async function extractPdfText(arrayBuffer) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then(p => p.getTextContent()).then(c => c.items.map(item => item.str).join(' '))
    )
  );
  return pages.join('\n');
}

const Parser = (() => {

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

          const csvParts = [];
          const sheets   = [];
          let   numYears = 0;

          wb.SheetNames.forEach(name => {
            const sheet    = wb.Sheets[name];
            const aoa      = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            const filtered = aoa.filter(row =>
              row.some(cell => cell !== '' && cell !== null && cell !== undefined)
            );

            csvParts.push(`\n\n--- SHEET: ${name} ---\n` + filtered.map(row => row.join('\t')).join('\n'));
            sheets.push({ name, aoa: filtered });

            const sheetYears = detectNumYears(aoa);
            if (sheetYears > numYears) numYears = sheetYears;
          });

          const csvText = csvParts.join('');

          resolve({ csvText, sheets, numYears });
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
