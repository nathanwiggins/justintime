const Settings = (() => {
  const KEY_API      = 'jit_api_key';
  const KEY_PROFILES = 'jit_profiles';

  let profiles        = [];
  let editingId       = null;

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadApiKey() {
    return localStorage.getItem(KEY_API) || '';
  }

  function persistApiKey(key) {
    localStorage.setItem(KEY_API, key);
  }

  function loadProfiles() {
    const raw = localStorage.getItem(KEY_PROFILES);
    profiles = raw ? JSON.parse(raw) : [];
    return profiles;
  }

  function persistProfiles() {
    localStorage.setItem(KEY_PROFILES, JSON.stringify(profiles));
  }

  function getProfiles() {
    return profiles;
  }

  function getProfileById(id) {
    return profiles.find(p => p.id === id) || null;
  }

  function upsertProfile(data) {
    if (data.id) {
      const idx = profiles.findIndex(p => p.id === data.id);
      if (idx !== -1) {
        profiles[idx] = data;
      } else {
        profiles.push(data);
      }
    } else {
      profiles.push({ ...data, id: generateId() });
    }
    persistProfiles();
  }

  function removeProfile(id) {
    profiles = profiles.filter(p => p.id !== id);
    persistProfiles();
  }

  function renderProfiles() {
    const list     = document.getElementById('profile-list');
    const emptyMsg = document.getElementById('no-profiles-message');

    list.querySelectorAll('.profile-card').forEach(c => c.remove());

    if (profiles.length === 0) {
      emptyMsg.style.display = '';
      return;
    }

    emptyMsg.style.display = 'none';

    profiles.forEach(profile => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      card.dataset.id = profile.id;

      const name = document.createElement('span');
      name.className = 'profile-card-name';
      name.textContent = profile.name;

      const actions = document.createElement('div');
      actions.className = 'profile-card-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openModal(profile.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (!confirm(`Delete profile "${profile.name}"?`)) return;
        removeProfile(profile.id);
        renderProfiles();
        Generator.syncProfileDropdown();
      });

      actions.append(editBtn, deleteBtn);
      card.append(name, actions);
      list.appendChild(card);
    });
  }

  function openModal(profileId = null) {
    editingId = profileId;

    const modal    = document.getElementById('profile-modal');
    const title    = document.getElementById('modal-title');
    const nameEl   = document.getElementById('profile-name-input');
    const fringeEl = document.getElementById('fringe-boilerplate-input');
    const faEl     = document.getElementById('fa-boilerplate-input');
    const errEl    = document.getElementById('profile-name-error');

    errEl.classList.add('hidden');

    if (profileId) {
      const p = getProfileById(profileId);
      title.textContent  = 'Edit Profile';
      nameEl.value       = p.name;
      fringeEl.value     = p.fringeBoilerplate;
      faEl.value         = p.faBoilerplate;
    } else {
      title.textContent = 'New Profile';
      nameEl.value      = '';
      fringeEl.value    = '';
      faEl.value        = '';
    }

    modal.classList.remove('hidden');
    nameEl.focus();
  }

  function closeModal() {
    document.getElementById('profile-modal').classList.add('hidden');
    editingId = null;
  }

  function saveProfileFromModal() {
    const name             = document.getElementById('profile-name-input').value.trim();
    const fringeBoilerplate = document.getElementById('fringe-boilerplate-input').value.trim();
    const faBoilerplate     = document.getElementById('fa-boilerplate-input').value.trim();
    const errEl             = document.getElementById('profile-name-error');

    if (!name) {
      errEl.classList.remove('hidden');
      document.getElementById('profile-name-input').focus();
      return;
    }

    errEl.classList.add('hidden');
    upsertProfile({ id: editingId, name, fringeBoilerplate, faBoilerplate });
    renderProfiles();
    Generator.syncProfileDropdown();
    closeModal();
  }

  function initApiKeySection() {
    const input     = document.getElementById('api-key-input');
    const toggleBtn = document.getElementById('toggle-key-visibility');
    const saveBtn   = document.getElementById('save-api-key');
    const status    = document.getElementById('api-key-status');

    const stored = loadApiKey();
    if (stored) input.value = stored;

    toggleBtn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type        = isHidden ? 'text' : 'password';
      toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
    });

    saveBtn.addEventListener('click', () => {
      const key = input.value.trim();
      if (!key) {
        status.textContent = 'Please enter an API key.';
        status.className   = 'status-message error';
        return;
      }
      persistApiKey(key);
      status.textContent = 'API key saved.';
      status.className   = 'status-message success';
      setTimeout(() => {
        status.textContent = '';
        status.className   = 'status-message';
      }, 3000);
    });
  }

  function initProfilesSection() {
    loadProfiles();
    renderProfiles();

    document.getElementById('add-profile-btn').addEventListener('click', () => openModal(null));
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-modal').addEventListener('click', closeModal);
    document.getElementById('save-profile-btn').addEventListener('click', saveProfileFromModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);

    document.getElementById('profile-modal').addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function init() {
    initApiKeySection();
    initProfilesSection();
  }

  return { init, getProfiles, getProfileById, loadApiKey };
})();
