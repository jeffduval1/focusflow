let db;

// Première ouverture (version 3)
const request = indexedDB.open("focusflowDB", 3);

request.onupgradeneeded = (e) => {
  db = e.target.result;

  // Store tasks
  if (!db.objectStoreNames.contains("tasks")) {
    db.createObjectStore("tasks", { keyPath: "id", autoIncrement: true });
  }

  // Store events
  if (!db.objectStoreNames.contains("events")) {
    db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
  }

  // Store categories
  if (!db.objectStoreNames.contains("categories")) {
    const catStore = db.createObjectStore("categories", { keyPath: "id" });
    catStore.createIndex("name", "name", { unique: false });
  }

  // 🔹 Nouveau : store workspaces
  if (!db.objectStoreNames.contains("workspaces")) {
    const wsStore = db.createObjectStore("workspaces", { keyPath: "id" });
    wsStore.createIndex("name", "name", { unique: false });
  }
};

export let dbReady = new Promise((resolve) => {
  const request = indexedDB.open("focusflowDB", 3);

  request.onupgradeneeded = (e) => {
    db = e.target.result;

    // Store tasks
    if (!db.objectStoreNames.contains("tasks")) {
      db.createObjectStore("tasks", { keyPath: "id", autoIncrement: true });
    }

    // Store events
    if (!db.objectStoreNames.contains("events")) {
      db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
    }

    // Store categories
    if (!db.objectStoreNames.contains("categories")) {
      const catStore = db.createObjectStore("categories", { keyPath: "id" });
      catStore.createIndex("name", "name", { unique: false });
    }

    // 🔹 Nouveau : store workspaces
    if (!db.objectStoreNames.contains("workspaces")) {
      const wsStore = db.createObjectStore("workspaces", { keyPath: "id" });
      wsStore.createIndex("name", "name", { unique: false });
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    console.log("DB ready (v3)");
    resolve();
  };

  request.onerror = (e) => {
    console.error("DB error:", e.target.errorCode);
  };
});


export function addData(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.add(data);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

export function getAllData(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

export function updateData(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

export function deleteData(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}
// ---- CATEGORIES ----
export function getCategories() {
  return new Promise((resolve, reject) => {
    const request = db.transaction("categories", "readonly")
      .objectStore("categories")
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

export function addCategory(cat) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("categories", "readwrite")
      .objectStore("categories")
      .add(cat);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export function updateCategory(cat) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("categories", "readwrite")
      .objectStore("categories")
      .put(cat);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export function deleteCategory(id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction("categories", "readwrite")
      .objectStore("categories")
      .delete(id);

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
