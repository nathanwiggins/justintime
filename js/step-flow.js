const StepFlow = (() => {
  function create({ container, steps, onStepChange, onFinish }) {
    let index = 0;
    let destroyed = false;

    container.innerHTML = '';

    const stage = document.createElement('div');
    stage.className = 'step-flow-stage';

    const dotsRow = document.createElement('div');
    dotsRow.className = 'step-flow-dots';
    const dots = steps.map(() => {
      const dot = document.createElement('span');
      dot.className = 'step-flow-dot';
      dotsRow.appendChild(dot);
      return dot;
    });

    const controls = document.createElement('div');
    controls.className = 'step-flow-controls';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-secondary';
    backBtn.textContent = 'Back';

    const restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.className = 'btn-link step-flow-restart hidden';
    restartBtn.textContent = '↻ Restart';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn-primary';

    controls.appendChild(backBtn);
    controls.appendChild(restartBtn);
    controls.appendChild(nextBtn);

    container.appendChild(stage);
    container.appendChild(dotsRow);
    container.appendChild(controls);

    function isLastStep() { return index === steps.length - 1; }

    function render() {
      stage.innerHTML = '';
      steps[index].render(stage);
      dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
      backBtn.disabled = index === 0;
      nextBtn.textContent = isLastStep() ? 'Got it' : 'Next';
      restartBtn.classList.toggle('hidden', !isLastStep());
      if (onStepChange) onStepChange(index);
    }

    function goTo(i) {
      if (destroyed) return;
      index = Math.max(0, Math.min(steps.length - 1, i));
      render();
    }

    function next() {
      if (isLastStep()) { if (onFinish) onFinish(); return; }
      goTo(index + 1);
    }

    function back() { goTo(index - 1); }

    stage.addEventListener('click', () => {
      if (!isLastStep()) next();
    });

    backBtn.addEventListener('click', back);
    nextBtn.addEventListener('click', next);
    restartBtn.addEventListener('click', () => goTo(0));

    render();

    return {
      next,
      back,
      goTo,
      destroy() {
        destroyed = true;
        container.innerHTML = '';
      }
    };
  }

  return { create };
})();
