const ValidationCheckpoint = (() => {
  const PASS_MESSAGE = 'Artificial Intelligence (AI) tried its best to give a starting point for this budget justification. This justification passed validation, but some inaccuracies are possible in every generation attempt. Would you like to keep this version, or generate a new starting point?';
  const FAIL_MESSAGE = 'Artificial Intelligence (AI) tried its best to give a starting point for this budget justification, but our validation noticed that there are some inaccuracies. Some inaccuracies are possible in every generation attempt. Would you like to keep this version, or generate a new starting point?';

  function withinTolerance(a, b) {
    const diff = Math.abs(a - b);
    return diff <= 1 || diff / Math.max(Math.abs(a), Math.abs(b), 1) <= 0.01;
  }

  function run({ project, payload, valueGraph, templateType }) {
    return new Promise(resolve => {
      const calculatedTotal = valueGraph.nodes['totals.grand'].amount;
      const passed = withinTolerance(project.totalBudget, calculatedTotal);

      const message = document.getElementById('validation-message');
      message.textContent = passed ? PASS_MESSAGE : FAIL_MESSAGE;
      message.classList.toggle('validation-fail', !passed);

      document.getElementById('validation-total-budget').textContent = `Your Total Budget: $${Number(project.totalBudget || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      document.getElementById('validation-calculated-total').textContent = `Calculated from this draft: $${Number(calculatedTotal || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

      EditorCanvas.openReadOnly(document.getElementById('validation-preview'), payload, valueGraph, templateType);

      const modal = document.getElementById('validation-modal');
      modal.classList.remove('hidden');

      const regenerateBtn = document.getElementById('validation-regenerate-btn');
      const keepBtn       = document.getElementById('validation-keep-btn');

      function cleanup() {
        modal.classList.add('hidden');
        regenerateBtn.removeEventListener('click', onRegenerate);
        keepBtn.removeEventListener('click', onKeep);
      }

      function onRegenerate() {
        cleanup();
        resolve('regenerate');
      }

      async function onKeep() {
        project.document = {
          payload, valueGraph, phase: 'editing',
          lastValidation: { passed, totalBudget: project.totalBudget, calculatedTotal, timestamp: Date.now() }
        };
        await ProjectPicker.persistActive();
        cleanup();
        resolve('keep');
      }

      regenerateBtn.addEventListener('click', onRegenerate);
      keepBtn.addEventListener('click', onKeep);
    });
  }

  return { run };
})();
