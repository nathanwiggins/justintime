const Validator = (() => {
  const TOLERANCE = 0.01;

  function sumField(arr, field) {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((total, item) => total + (Number(item[field]) || 0), 0);
  }

  function computeAiTotals(aiJson) {
    const totals = {};

    const personnelSalary =
      sumField(aiJson.senior_personnel, 'salary') +
      sumField(aiJson.other_personnel,  'salary') +
      sumField(aiJson.personnel,         'salary');

    if (personnelSalary > 0) totals.total_personnel_salary = personnelSalary;

    const equipmentTotal = sumField(aiJson.equipment, 'cost');
    if (equipmentTotal > 0) totals.total_equipment = equipmentTotal;

    const travelTotal =
      sumField(aiJson.travel,          'cost') +
      sumField(aiJson.domestic_travel, 'cost') +
      sumField(aiJson.foreign_travel,  'cost');

    if (travelTotal > 0) totals.total_travel = travelTotal;

    const otherDirectTotal = [
      'materials_supplies', 'publications', 'consultants', 'computer_services',
      'subawards', 'other_direct_lines', 'trainee_support', 'user_fees',
      'alterations', 'direct_costs'
    ].reduce((sum, key) => sum + sumField(aiJson[key], 'cost'), 0);

    const grandTotal = personnelSalary + equipmentTotal + travelTotal + otherDirectTotal;
    if (grandTotal > 0) totals.total_direct_costs = grandTotal;

    return totals;
  }

  function findMatchingTruthKey(aiKey, sourceTruth) {
    const words = aiKey.replace(/_/g, ' ').split(' ').filter(w => w.length > 3);
    return Object.keys(sourceTruth).find(truthKey => {
      const normalized = truthKey.replace(/_/g, ' ');
      return words.some(word => normalized.includes(word));
    }) || null;
  }

  function validate(aiJson, sourceTruth) {
    if (!sourceTruth || Object.keys(sourceTruth).length === 0) {
      return { valid: true, mismatches: [] };
    }

    const aiTotals  = computeAiTotals(aiJson);
    const mismatches = [];

    Object.entries(aiTotals).forEach(([aiKey, aiAmount]) => {
      const matchedKey = findMatchingTruthKey(aiKey, sourceTruth);
      if (!matchedKey) return;

      const truthAmount = sourceTruth[matchedKey];
      const diff        = Math.abs(aiAmount - truthAmount);
      const pct         = truthAmount > 0 ? diff / truthAmount : 0;

      if (pct > TOLERANCE) {
        mismatches.push({
          label:       aiKey.replace(/_/g, ' '),
          aiAmount,
          truthAmount,
          difference:  diff
        });
      }
    });

    return { valid: mismatches.length === 0, mismatches };
  }

  return { validate };
})();
