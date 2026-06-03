async function loadLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el) return;
  try {
    const res = await fetch('https://api.github.com/repos/nathanwiggins/justintime/commits?per_page=1');
    if (!res.ok) return;
    const [commit] = await res.json();
    const date = new Date(commit.commit.committer.date);
    el.textContent = `Last updated ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
  } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
  Settings.init();
  Generator.init();
  loadLastUpdated();

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
