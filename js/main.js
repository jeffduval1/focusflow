import {
  dbReady,
  getAllData,
  updateData,
  updateWorkspace,
  addWorkspace,
  deleteData,
  deleteWorkspace,
} from "./db.js";
import { addTask, getTasks, updateTask } from "./tasks.js";
import { addEvent, updateEvent, deleteEvent } from "./events.js";  
import { renderTasks, renderEvents } from "./ui.js?v=20260329c";
import { fetchCategories, createCategory, editCategory, removeCategory } from "./categories.js";
import { ensureDefaultWorkspace, getCurrentWorkspaceId, setCurrentWorkspaceId } from "./workspaces.js";

async function deleteWorkspaceCascade(wsId) {
  const tasks = await getAllData("tasks");
  for (const t of tasks) {
    if (t.workspaceId === wsId) await deleteData("tasks", t.id);
  }
  const events = await getAllData("events");
  for (const e of events) {
    if (e.workspaceId === wsId) await deleteData("events", e.id);
  }
  const categories = await getAllData("categories");
  for (const c of categories) {
    if (c.workspaceId === wsId) await deleteData("categories", c.id);
  }
  await deleteWorkspace(wsId);
}

async function pickWorkspaceAfterRemoval() {
  const all = await getAllData("workspaces");
  const actives = all.filter((w) => !w.archived);
  if (actives.length > 0) {
    setCurrentWorkspaceId(actives[0].id);
    return;
  }
  if (all.length === 0) {
    await ensureDefaultWorkspace();
    return;
  }
  await updateWorkspace({ ...all[0], archived: false });
  setCurrentWorkspaceId(all[0].id);
}

async function ensureActiveWorkspaceAfterArchive() {
  const all = await getAllData("workspaces");
  const actives = all.filter((w) => !w.archived);
  if (actives.length > 0) {
    setCurrentWorkspaceId(actives[0].id);
    return;
  }
  const newWs = {
    id: "ws-" + Date.now(),
    name: "Général",
    archived: false,
    createdAt: new Date().toISOString(),
  };
  await addWorkspace(newWs);
  setCurrentWorkspaceId(newWs.id);
}

function closeWorkspaceFlowMenu() {
  const menu = document.getElementById("workspaceFlowMenu");
  if (menu) menu.classList.add("hidden");
}

/** Remplace le bouton du flow par un champ pour renommer (évite double-clic seul). */
function attachFlowRenameEditor(trigger, currentWs) {
  if (!trigger || !currentWs || trigger.tagName !== "BUTTON") return;

  const input = document.createElement("input");
  input.type = "text";
  input.value = currentWs.name;
  input.className = "workspace-flow-trigger-edit";
  input.setAttribute("aria-label", "Nom du flow");

  const parent = trigger.parentNode;
  if (!parent) return;

  parent.replaceChild(input, trigger);
  input.focus();
  input.select();

  let settled = false;

  function onBlur() {
    void finalizeRename(true);
  }

  async function finalizeRename(save) {
    if (settled) return;
    settled = true;
    input.removeEventListener("blur", onBlur);

    if (!save) {
      parent.replaceChild(trigger, input);
      return;
    }

    const newName = input.value.trim() || currentWs.name;
    if (newName !== currentWs.name) {
      await updateWorkspace({ ...currentWs, name: newName });
    }
    await renderWorkspaceTabs();
    await renderArchivedSection();
  }

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      void finalizeRename(true);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      void finalizeRename(false);
    }
  });

  input.addEventListener("blur", onBlur);
}

// ---------------------------------------------------------
// 🔧 Migration initiale (inchangé)
// ---------------------------------------------------------
async function migrerWorkspaceIdSiNecessaire() {
  const wsId = await getCurrentWorkspaceId();

  const tasks = await getAllData("tasks");
  for (const t of tasks) {
    if (!("workspaceId" in t) || t.workspaceId == null) {
      t.cote = t.cote ?? 5;
      t.workspaceId = wsId;
      await updateData("tasks", t);
    }
  }

  const events = await getAllData("events");
  for (const e of events) {
    if (!("workspaceId" in e) || e.workspaceId == null) {
      e.workspaceId = wsId;
      await updateData("events", e);
    }
  }

  const categories = await getAllData("categories");
  for (const c of categories) {
    if (!("workspaceId" in c) || c.workspaceId == null) {
      c.workspaceId = wsId;
      await updateData("categories", c);
    }
  }
}



// ---------------------------------------------------------
// 🔷 Sélecteur de flow (menu déroulant)
// ---------------------------------------------------------
async function renderWorkspaceTabs() {
  const container = document.getElementById("workspaceTabs");
  if (!container) return;

  const all = await getAllData("workspaces");
  if (!all || all.length === 0) {
    container.innerHTML = "";
    return;
  }

  const currentId = await getCurrentWorkspaceId();
  const activeList = all.filter((w) => !w.archived);
  const currentWs =
    activeList.find((w) => w.id === currentId) || activeList[0] || null;

  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "workspace-flow-wrapper import-wrapper";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = "workspaceFlowTrigger";
  trigger.className = "workspace-flow-trigger";
  trigger.textContent = currentWs ? `${currentWs.name} ▼` : "Flow ▼";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "true");
  trigger.title =
    "Ouvrir le menu des flows — « Renommer ce flow » ou double-clic pour changer le nom";

  const menu = document.createElement("div");
  menu.id = "workspaceFlowMenu";
  menu.className = "dropdown workspace-flow-menu hidden";
  menu.setAttribute("role", "menu");

  const others = activeList.filter((w) => w.id !== currentWs?.id);

  if (others.length > 0) {
    const hint = document.createElement("div");
    hint.className = "workspace-menu-hint";
    hint.textContent = "Autres flows";
    menu.appendChild(hint);

    others.forEach((ws) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "workspace-menu-item";
      row.textContent = ws.name;
      row.addEventListener("click", async () => {
        closeWorkspaceFlowMenu();
        if (ws.id === currentId) return;
        setCurrentWorkspaceId(ws.id);
        await renderTasks();
        await renderEvents();
        await renderWorkspaceTabs();
        await renderArchivedSection();
      });
      menu.appendChild(row);
    });

    const sep0 = document.createElement("div");
    sep0.className = "workspace-menu-sep";
    menu.appendChild(sep0);
  }

  const renameBtn = document.createElement("button");
  renameBtn.type = "button";
  renameBtn.className = "workspace-menu-item";
  renameBtn.textContent = "✏️ Renommer ce flow…";
  renameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeWorkspaceFlowMenu();
    if (!currentWs) return;
    const tr = document.getElementById("workspaceFlowTrigger");
    attachFlowRenameEditor(tr, currentWs);
  });
  menu.appendChild(renameBtn);

  const archiveBtn = document.createElement("button");
  archiveBtn.type = "button";
  archiveBtn.className = "workspace-menu-item workspace-menu-item-muted";
  archiveBtn.textContent = "📦 Archiver ce flow";
  archiveBtn.addEventListener("click", async () => {
    if (!currentWs) return;
    closeWorkspaceFlowMenu();
    const msg = `Archiver le flow « ${currentWs.name} » ?`;
    if (!confirm(msg)) return;

    await updateWorkspace({ ...currentWs, archived: true });

    const othersLeft = activeList.filter((w) => w.id !== currentWs.id);
    if (othersLeft.length > 0) {
      setCurrentWorkspaceId(othersLeft[0].id);
    } else {
      await ensureActiveWorkspaceAfterArchive();
    }

    await renderWorkspaceTabs();
    await renderArchivedSection();
    await renderTasks();
    await renderEvents();
  });
  menu.appendChild(archiveBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "workspace-menu-item workspace-menu-danger";
  deleteBtn.textContent = "🗑️ Supprimer ce flow…";
  deleteBtn.addEventListener("click", async () => {
    if (!currentWs) return;
    closeWorkspaceFlowMenu();
    const msg =
      `Supprimer définitivement « ${currentWs.name} » ?\n\n` +
      "Toutes les tâches, échéances et rendez-vous de ce flow seront effacés.";
    if (!confirm(msg)) return;

    await deleteWorkspaceCascade(currentWs.id);
    await pickWorkspaceAfterRemoval();

    await renderWorkspaceTabs();
    await renderArchivedSection();
    await renderTasks();
    await renderEvents();
  });
  menu.appendChild(deleteBtn);

  const sep1 = document.createElement("div");
  sep1.className = "workspace-menu-sep";
  menu.appendChild(sep1);

  const newBtn = document.createElement("button");
  newBtn.type = "button";
  newBtn.className = "workspace-menu-item workspace-menu-new";
  newBtn.textContent = "+ Nouveau flow";
  newBtn.addEventListener("click", async () => {
    closeWorkspaceFlowMenu();
    const allWs = await getAllData("workspaces");
    const existingNames = new Set(allWs.map((w) => w.name));

    let index = allWs.length + 1;
    let candidate = "Flow " + index;

    while (existingNames.has(candidate)) {
      index++;
      candidate = "Flow " + index;
    }

    const newWs = {
      id: "ws-" + Date.now(),
      name: candidate,
      archived: false,
      createdAt: new Date().toISOString(),
    };

    await addWorkspace(newWs);
    setCurrentWorkspaceId(newWs.id);

    await renderTasks();
    await renderEvents();
    await renderWorkspaceTabs();
    await renderArchivedSection();
  });
  menu.appendChild(newBtn);

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.detail >= 2) return;
    menu.classList.toggle("hidden");
    const isOpen = !menu.classList.contains("hidden");
    trigger.setAttribute("aria-expanded", String(isOpen));
  });

  trigger.addEventListener("dblclick", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeWorkspaceFlowMenu();
    attachFlowRenameEditor(trigger, currentWs);
  });

  wrap.appendChild(trigger);
  wrap.appendChild(menu);
  container.appendChild(wrap);
}

function onWorkspaceFlowOutsideClick(e) {
  if (!e.target.closest(".workspace-flow-wrapper")) {
    closeWorkspaceFlowMenu();
    const tr = document.getElementById("workspaceFlowTrigger");
    if (tr) tr.setAttribute("aria-expanded", "false");
  }
}

function onWorkspaceFlowEscape(e) {
  if (e.key === "Escape") {
    closeWorkspaceFlowMenu();
    const tr = document.getElementById("workspaceFlowTrigger");
    if (tr) tr.setAttribute("aria-expanded", "false");
  }
}



// ---------------------------------------------------------
// 🟦 ÉTAPE 6.1 — Nouveau : Bloc "ARCHIVÉS"
// ---------------------------------------------------------
async function renderArchivedSection() {
  const section = document.getElementById("archivedSection");
  const header = document.getElementById("archivedHeader");
  const list = document.getElementById("archivedList");

  if (!section || !header || !list) return;

  const all = await getAllData("workspaces");
  const archived = all.filter(w => w.archived);

  // Nombre affiché dans le titre
  header.textContent = `📦 Archivés (${archived.length})`;

  // Si aucun → masquer complètement
  if (archived.length === 0) {
    section.classList.add("hidden");
    list.innerHTML = "";
    return;
  }

  section.classList.remove("hidden");
  list.innerHTML = "";

  archived.forEach(ws => {
    const row = document.createElement("div");
    row.classList.add("archived-row");

    const title = document.createElement("span");
    title.className = "archived-row-title";
    title.textContent = ws.name;
    row.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "archived-row-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "↩️ Désarchiver";
    btn.classList.add("unarchive-btn");

    btn.addEventListener("click", async () => {
      await updateWorkspace({ ...ws, archived: false });

      await renderWorkspaceTabs();
      await renderArchivedSection();
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "🗑️ Supprimer";
    delBtn.classList.add("archived-delete-btn");
    delBtn.addEventListener("click", async () => {
      if (
        !confirm(
          `Supprimer définitivement « ${ws.name} » ? Les données de ce flow seront effacées.`
        )
      ) {
        return;
      }
      await deleteWorkspaceCascade(ws.id);
      await renderWorkspaceTabs();
      await renderArchivedSection();
      await renderTasks();
      await renderEvents();
    });

    actions.appendChild(btn);
    actions.appendChild(delBtn);
    row.appendChild(actions);
    list.appendChild(row);
  });

  // Collapse
  header.onclick = () => {
    list.classList.toggle("hidden");
  };
}



// ---------------------------------------------------------
// 🔄 Initialisation
// ---------------------------------------------------------
await dbReady;
await ensureDefaultWorkspace();
await migrerWorkspaceIdSiNecessaire();
await renderWorkspaceTabs();
await renderArchivedSection();
renderTasks();
renderEvents();
initCollapsibleEisenhower();
initCollapsiblePanels();

document.addEventListener("click", onWorkspaceFlowOutsideClick);
document.addEventListener("keydown", onWorkspaceFlowEscape);
window.addEventListener("focusflow-workspaces-changed", async () => {
  await renderWorkspaceTabs();
  await renderArchivedSection();
});


// Rendre les listes Eisenhower collapsables par rangée (haut = 2, bas = 2)
function initCollapsibleEisenhower() {
  const urgentTop = document.getElementById("urgent-list");
  const importantTop = document.getElementById("important-list");
  const urgentBottom = document.getElementById("urgent-notimportant-list");
  const notUrgentBottom = document.getElementById("noturgent-notimportant-list");

  const bindRowToggle = (section, groupSections) => {
    const header = section.querySelector("h2");
    if (!header) return;

    header.addEventListener("click", () => {
      const shouldCollapse = !groupSections[0].classList.contains("collapsed");
      groupSections.forEach(sec => {
        sec.classList.toggle("collapsed", shouldCollapse);
      });
    });
  };

  bindRowToggle(urgentTop, [urgentTop, importantTop]);
  bindRowToggle(importantTop, [urgentTop, importantTop]);
  bindRowToggle(urgentBottom, [urgentBottom, notUrgentBottom]);
  bindRowToggle(notUrgentBottom, [urgentBottom, notUrgentBottom]);
}
// Rendre les panneaux Tâches / Échéances / Rendez-vous collapsables individuellement
function initCollapsiblePanels() {
  const taskSection = document.getElementById("task-list");
  const deadlinesSection = document.getElementById("deadlines");
  const eventsSection = document.getElementById("events");

  const makeSingleCollapsible = (section) => {
    if (!section) return;
    const header = section.querySelector("h2");
    if (!header) return;

    header.style.cursor = "pointer";

    header.addEventListener("click", () => {
      section.classList.toggle("collapsed");
    });
  };

  makeSingleCollapsible(taskSection);
  makeSingleCollapsible(deadlinesSection);
  makeSingleCollapsible(eventsSection);
}
