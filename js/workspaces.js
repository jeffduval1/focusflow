import {
  getWorkspaces,
  addWorkspace,
} from "./db.js";

const CURRENT_WS_KEY = "focusflow-current-workspace";

// 🔹 S'assure qu'il existe au moins un workspace ("Général")
// et qu'un currentWorkspaceId cohérent est enregistré dans localStorage.
export async function ensureDefaultWorkspace() {
  const all = await getWorkspaces();

  if (all.length === 0) {
    const defaultWs = {
      id: "ws-default",
      name: "Général",
      archived: false,
      createdAt: new Date().toISOString(),
    };

    await addWorkspace(defaultWs);
    localStorage.setItem(CURRENT_WS_KEY, defaultWs.id);
    return defaultWs;
  } else {
    // Vérifie si le workspace courant dans localStorage est encore valide
    const storedId = localStorage.getItem(CURRENT_WS_KEY);
    const existing = all.find(w => w.id === storedId && !w.archived);

    if (existing) {
      return existing;
    }

    // Sinon, on choisit un workspace actif, ou à défaut le premier
    const active = all.find(w => !w.archived) || all[0];
    localStorage.setItem(CURRENT_WS_KEY, active.id);
    return active;
  }
}

// 🔹 Récupère l'ID du workspace courant
export async function getCurrentWorkspaceId() {
  const all = await getWorkspaces();
  if (all.length === 0) {
    const ws = await ensureDefaultWorkspace();
    return ws.id;
  }

  const storedId = localStorage.getItem(CURRENT_WS_KEY);
  const existing = all.find(w => w.id === storedId && !w.archived);

  if (existing) {
    return existing.id;
  }

  const active = all.find(w => !w.archived) || all[0];
  localStorage.setItem(CURRENT_WS_KEY, active.id);
  return active.id;
}

// 🔹 Définit le workspace courant (à utiliser plus tard quand on aura les onglets)
export function setCurrentWorkspaceId(id) {
  localStorage.setItem(CURRENT_WS_KEY, id);
}

// 🔹 Récupère l'objet workspace courant complet
export async function getCurrentWorkspace() {
  const all = await getWorkspaces();
  const id = await getCurrentWorkspaceId();
  return all.find(w => w.id === id) || null;
}
