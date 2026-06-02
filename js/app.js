document.addEventListener('DOMContentLoaded', () => {
  Settings.init();
  Generator.init();

  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.add('hidden'));

      btn.classList.add('active');
      document.getElementById(`tab-${target}`).classList.remove('hidden');
    });
  });
});
