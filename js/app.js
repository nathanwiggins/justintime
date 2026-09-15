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

document.addEventListener('DOMContentLoaded', async () => {
  setupEnvironment();

  await Settings.init();
  Generator.init();
  VerifierChat.init();
  VerifierTab.init();
  HowItWorks.init();
  EditorCanvas.init();
  await ProjectPicker.init();
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

      if (target === 'verify') syncVerifyInputsFromProject();
    });
  });

  document.addEventListener('project:opened', () => syncVerifyInputsFromProject());
});

function setInputFile(inputId, file) {
  const input = document.getElementById(inputId);
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function resetDropZone(zoneId, inputId, filenameId) {
  const zone     = document.getElementById(zoneId);
  const input    = document.getElementById(inputId);
  const filename = document.getElementById(filenameId);

  input.value = '';
  filename.textContent = '';
  filename.classList.add('hidden');
  zone.classList.remove('has-file');
  const content = zone.querySelector('.drop-zone-content');
  if (content) content.classList.remove('hidden');
}

async function snapshotJustificationFile(project) {
  if (project.document && project.document.blocks && project.document.blocks.length) {
    const { blob, fileName } = await Document.buildBlob(project.templateType, project.document.blocks, project.document.valueGraph);
    return new File([blob], fileName, { type: blob.type });
  }
  if (project.exportedJustification && project.exportedJustification.fileBlob) {
    return project.exportedJustification.fileBlob;
  }
  return null;
}

async function syncVerifyInputsFromProject() {
  const project = ProjectPicker.getActive();
  if (!project) return;

  if (project.spreadsheet && project.spreadsheet.fileBlob) {
    setInputFile('verify-budget-input', project.spreadsheet.fileBlob);
  }

  const justificationFile = await snapshotJustificationFile(project);
  if (justificationFile) {
    setInputFile('verify-justification-input', justificationFile);
  }
}
