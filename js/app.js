async function enforceVandalizerAuth() {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 401) {
      console.log("Vandalizer detected: User is logged out. Redirecting to login...");
      window.location.href = `/login?redirect=/justintime/`;
      return;
    }
    
    if (!response.ok) {
      console.warn(`Auth check returned ${response.status}. Assuming standalone deployment. Bypassing auth.`);
      return; 
    }

    console.log("Vandalizer detected: User is fully authenticated.");
    
  } catch (error) {
    console.warn("Could not reach Vandalizer API. Assuming standalone deployment. Bypassing auth.");
  }
}

function setupEnvironment() {
  const hostname = window.location.hostname;
  
  const isGitHubPages = hostname.includes('github.io');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (!isGitHubPages && !isLocalhost) {
    window.JIT_GLOBAL_CONFIG = { useVandalizerProxy: true };
    console.log("DGX Environment detected: Enforcing Vandalizer Authentication.");
    enforceVandalizerAuth();
  } else {
    window.JIT_GLOBAL_CONFIG = { useVandalizerProxy: false };
    console.log("Public/Local Environment detected: Bypassing authentication.");
  }
}

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

function initCyclingLabel() {
  const words = ['Summary', 'Abstract', 'Narrative', 'Statement of Work', 'Description'];
  let index   = 0;
  const el    = document.getElementById('summary-label-word');
  if (!el) return;

  setInterval(() => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(-8px)';

    setTimeout(() => {
      index          = (index + 1) % words.length;
      el.textContent = words[index];

      el.style.transition = 'none';
      el.style.transform  = 'translateY(8px)';
      el.offsetHeight;

      el.style.transition = '';
      el.style.opacity    = '1';
      el.style.transform  = 'translateY(0)';
    }, 350);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  setupEnvironment();

  Settings.init();
  Generator.init();
  VerifierChat.init();
  VerifierTab.init();
  loadLastUpdated();
  initCyclingLabel();

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
