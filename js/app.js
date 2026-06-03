async function loadLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el) return;
  try {
    const res = await fetch('https://api.github.com/repos/nathanwiggins/justintime/commits?per_page=1');
    if (!res.ok) return;
    const [commit] = await res.json();
    const date = new Date(commit.commit.committer.date);
    const datePart = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const timePart = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.textContent = `Last updated ${datePart} at ${timePart}`;
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
