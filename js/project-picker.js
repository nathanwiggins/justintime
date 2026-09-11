const ProjectPicker = (() => {
  let projects = [];
  let active   = null;
  let editingId = null;

  function formatMeta(project) {
    const templateLabel = project.templateType === 'general' ? 'General' : 'NSF';
    const date = new Date(project.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    return `${templateLabel} · Updated ${date}`;
  }

  function renderProjects() {
    const list     = document.getElementById('project-list');
    const emptyMsg = document.getElementById('no-projects-message');

    list.querySelectorAll('.project-card').forEach(c => c.remove());

    if (projects.length === 0) {
      emptyMsg.style.display = '';
      return;
    }

    emptyMsg.style.display = 'none';

    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.dataset.id = project.id;
      card.addEventListener('click', () => openProject(project.id));

      const info = document.createElement('div');
      info.className = 'project-card-info';

      const name = document.createElement('span');
      name.className = 'project-card-name';
      name.textContent = project.name;

      const meta = document.createElement('span');
      meta.className = 'project-card-meta';
      meta.textContent = formatMeta(project);

      info.append(name, meta);

      const actions = document.createElement('div');
      actions.className = 'project-card-actions';

      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn btn-secondary btn-sm';
      renameBtn.textContent = 'Rename';
      renameBtn.addEventListener('click', e => {
        e.stopPropagation();
        openModal(project.id);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
        removeProject(project.id);
      });

      actions.append(renameBtn, deleteBtn);
      card.append(info, actions);
      list.appendChild(card);
    });
  }

  async function loadProjects() {
    projects = await ProjectStore.list();
    renderProjects();
  }

  async function removeProject(id) {
    await ProjectStore.remove(id);
    await loadProjects();
  }

  function openModal(projectId = null) {
    editingId = projectId;

    const modal  = document.getElementById('project-modal');
    const title  = document.getElementById('project-modal-title');
    const nameEl = document.getElementById('project-name-input');
    const errEl  = document.getElementById('project-name-error');

    errEl.classList.add('hidden');

    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      title.textContent = 'Rename Project';
      nameEl.value = project ? project.name : '';
    } else {
      title.textContent = 'New Project';
      nameEl.value = '';
    }

    modal.classList.remove('hidden');
    nameEl.focus();
  }

  function closeModal() {
    document.getElementById('project-modal').classList.add('hidden');
    editingId = null;
  }

  async function saveModal() {
    const nameEl = document.getElementById('project-name-input');
    const errEl  = document.getElementById('project-name-error');
    const name   = nameEl.value.trim();

    if (!name) {
      errEl.classList.remove('hidden');
      nameEl.focus();
      return;
    }
    errEl.classList.add('hidden');

    if (editingId) {
      await ProjectStore.rename(editingId, name);
    } else {
      const project = await ProjectStore.create(name);
      closeModal();
      await loadProjects();
      openProject(project.id);
      return;
    }

    closeModal();
    await loadProjects();
  }

  function showPicker() {
    active = null;
    document.getElementById('project-picker').classList.remove('hidden');
    document.querySelector('.tab-nav').classList.add('hidden');
    document.querySelector('.app-main').classList.add('hidden');
    document.getElementById('header-active-project').classList.add('hidden');
    loadProjects();
  }

  async function openProject(id) {
    const project = await ProjectStore.get(id);
    if (!project) return;

    active = project;

    document.getElementById('project-picker').classList.add('hidden');
    document.querySelector('.tab-nav').classList.remove('hidden');
    document.querySelector('.app-main').classList.remove('hidden');

    const activeBanner = document.getElementById('header-active-project');
    activeBanner.classList.remove('hidden');
    document.getElementById('header-active-project-name').textContent = project.name;

    document.dispatchEvent(new CustomEvent('project:opened', { detail: { project } }));
  }

  function getActive() {
    return active;
  }

  async function persistActive() {
    if (!active) return null;
    active = await ProjectStore.save(active);
    return active;
  }

  function init() {
    document.getElementById('new-project-btn').addEventListener('click', () => openModal(null));
    document.getElementById('close-project-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-project-modal').addEventListener('click', closeModal);
    document.getElementById('save-project-btn').addEventListener('click', saveModal);
    document.querySelector('#project-modal .modal-overlay').addEventListener('click', closeModal);
    document.getElementById('project-modal').addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
    document.getElementById('back-to-projects-btn').addEventListener('click', showPicker);

    return ProjectStore.init().then(showPicker);
  }

  return { init, getActive, persistActive, showPicker };
})();
