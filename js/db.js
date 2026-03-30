let db;

const DB_NAME = "focusflowDB";
const DB_VERSION = 4;

function ensureStores(database) {
  if (!database.objectStoreNames.contains("tasks")) {
    database.createObjectStore("tasks", { keyPath: "id", autoIncrement: true });
  }
  if (!database.objectStoreNames.contains("events")) {
    database.createObjectStore("events", { keyPath: "id", autoIncrement: true });
  }
  if (!database.objectStoreNames.contains("categories")) {
    const catStore = database.createObjectStore("categories", { keyPath: "id" });
    catStore.createIndex("name", "name", { unique: false });
  }
  if (!database.objectStoreNames.contains("workspaces")) {
    const wsStore = database.createObjectStore("workspaces", { keyPath: "id" });
    wsStore.createIndex("name", "name", { unique: false });
  }
  if (!database.objectStoreNames.contains("trashedTasks")) {
    database.createObjectStore("trashedTasks", { keyPath: "id", autoIncrement: true });
  }
  if (!database.objectStoreNames.contains("favoriteColors")) {
    const fc = database.createObjectStore("favoriteColors", { keyPath: "id", autoIncrement: true });
    fc.createIndex("byHex", "hex", { unique: true });
  }
  if (!database.objectStoreNames.contains("colorArchive")) {
    database.createObjectStore("colorArchive", { keyPath: "id", autoIncrement: true });
  }
}

export let dbReady = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (e) => {
    const database = e.target.result;
    ensureStores(database);
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    resolve();
  };

  request.onerror = () => {
    reject(request.error);
  };
});

export function addData(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.add(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function addDataReturnId(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getAllData(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function updateData(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function deleteData(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getFavoriteByHex(hex) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("favoriteColors", "readonly");
    const idx = tx.objectStore("favoriteColors").index("byHex");
    const req = idx.get(hex);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---- CATEGORIES ----
export function getCategories() {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("categories", "readonly")
      .objectStore("categories")
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

export function addCategory(cat) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("categories", "readwrite").objectStore("categories").add(cat);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export function updateCategory(cat) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("categories", "readwrite").objectStore("categories").put(cat);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export function deleteCategory(id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("categories", "readwrite").objectStore("categories").delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}
// ---- WORKSPACES ----
export function getWorkspaces() {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("workspaces", "readonly")
      .objectStore("workspaces")
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

export function addWorkspace(ws) {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("workspaces", "readwrite")
      .objectStore("workspaces")
      .add(ws);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export function updateWorkspace(ws) {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("workspaces", "readwrite")
      .objectStore("workspaces")
      .put(ws);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export function deleteWorkspace(id) {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("workspaces", "readwrite")
      .objectStore("workspaces")
      .delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}
