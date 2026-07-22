const Settings = (() => {
  const KEY_API      = 'jit_api_key';
  const KEY_PROFILES = 'jit_profiles';
  const KEY_DEFAULT  = 'jit_default_profile';

  const API_KEY_WARNING_HTML = `
    <strong>⚠ Data Privacy Notice</strong>
    <p>A standard (free-tier) Gemini API key is not covered by an enterprise data-processing agreement. Google may log, store, and use the prompts and documents you send — including budget data — to review or improve its models.</p>
    <ul>
      <li>Always review the data-sharing and retention terms before generating or using any API key.</li>
      <li>Never paste sensitive, confidential, or personally identifiable information into an AI-connected field.</li>
      <li>Treat a free API key as suitable for demos and testing only — not for real, sensitive budget data.</li>
    </ul>
  `;

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

  function getDefaultProfileId() {
    return localStorage.getItem(KEY_DEFAULT) || '';
  }

  function setDefaultProfile(id) {
    localStorage.setItem(KEY_DEFAULT, id);
  }

  function removeProfile(id) {
    profiles = profiles.filter(p => p.id !== id);
    persistProfiles();
    if (getDefaultProfileId() === id) localStorage.removeItem(KEY_DEFAULT);
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

    const defaultId = getDefaultProfileId();

    profiles.forEach(profile => {
      const isDefault = profile.id === defaultId;

      const card = document.createElement('div');
      card.className = 'profile-card';
      card.dataset.id = profile.id;

      const name = document.createElement('span');
      name.className = 'profile-card-name';
      name.textContent = profile.name;

      if (isDefault) {
        const badge = document.createElement('span');
        badge.className = 'profile-default-badge';
        badge.textContent = 'Default';
        name.appendChild(badge);
      }

      const actions = document.createElement('div');
      actions.className = 'profile-card-actions';

      if (!isDefault) {
        const defaultBtn = document.createElement('button');
        defaultBtn.className = 'btn btn-secondary btn-sm';
        defaultBtn.textContent = 'Set Default';
        defaultBtn.addEventListener('click', () => {
          setDefaultProfile(profile.id);
          renderProfiles();
          Generator.syncProfileDropdown();
        });
        actions.appendChild(defaultBtn);
      }

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

  function openApiKeyWarningModal() {
    document.getElementById('api-key-warning-modal').classList.remove('hidden');
  }

  function closeApiKeyWarningModal() {
    document.getElementById('api-key-warning-modal').classList.add('hidden');
  }

  function initApiKeyWarning() {
    document.getElementById('api-key-warning-banner').innerHTML    = API_KEY_WARNING_HTML;
    document.getElementById('api-key-warning-modal-body').innerHTML = API_KEY_WARNING_HTML;

    document.getElementById('api-key-warning-close').addEventListener('click', closeApiKeyWarningModal);
    document.getElementById('api-key-warning-ack').addEventListener('click', closeApiKeyWarningModal);
    document.querySelector('#api-key-warning-modal .modal-overlay').addEventListener('click', closeApiKeyWarningModal);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('api-key-warning-modal').classList.contains('hidden')) {
        closeApiKeyWarningModal();
      }
    });
  }

  function initApiKeySection() {
    initApiKeyWarning();

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
      openApiKeyWarningModal();
    });

    const testBtn = document.getElementById('test-api-key');
    testBtn.addEventListener('click', async () => {
      const key = input.value.trim();
      if (!key) {
        status.textContent = 'Enter an API key first.';
        status.className   = 'status-message error';
        return;
      }

      testBtn.disabled     = true;
      testBtn.textContent  = 'Testing…';
      status.textContent   = '';
      status.className     = 'status-message';

      try {
        await Api.test(key);
        status.textContent = 'Connection successful — API key is working.';
        status.className   = 'status-message success';
      } catch (err) {
        status.textContent = 'Test failed: ' + err.message;
        status.className   = 'status-message error';
      } finally {
        testBtn.disabled    = false;
        testBtn.textContent = 'Test API Key';
      }
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

  return { init, getProfiles, getProfileById, loadApiKey, getDefaultProfileId };
})();
