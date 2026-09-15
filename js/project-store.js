const ProjectStore = (() => {
  const DB_NAME    = 'jit_projects_db';
  const DB_VERSION = 1;
  const STORE      = 'projects';

  let dbPromise = null;

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function openDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });

    return dbPromise;
  }

  async function withStore(mode, fn) {
    const db    = await openDb();
    const tx    = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = await fn(store);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(result);
      tx.onerror    = () => reject(tx.error);
      tx.onabort    = () => reject(tx.error);
    });
  }

  function requestToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function defaultProject(name) {
    const now = Date.now();
    return {
      id:        generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      templateType: 'nsf',
      numYears:     null,
      profileId:    '',
      totalBudget:  null,
      spreadsheet:  null,
      summary:      null,
      document:     null,
      exportedJustification: null,
      verificationHistory: []
    };
  }

  async function init() {
    await openDb();
  }

  async function list() {
    const all = await withStore('readonly', store => requestToPromise(store.getAll()));
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function get(id) {
    if (!id) return null;
    const project = await withStore('readonly', store => requestToPromise(store.get(id)));
    return project || null;
  }

  async function create(name) {
    const project = defaultProject(name);
    await withStore('readwrite', store => requestToPromise(store.put(project)));
    return project;
  }

  async function save(project) {
    project.updatedAt = Date.now();
    await withStore('readwrite', store => requestToPromise(store.put(project)));
    return project;
  }

  async function rename(id, name) {
    const project = await get(id);
    if (!project) return null;
    project.name = name;
    return save(project);
  }

  async function remove(id) {
    await withStore('readwrite', store => requestToPromise(store.delete(id)));
  }

  return { init, list, get, create, save, rename, remove };
})();
