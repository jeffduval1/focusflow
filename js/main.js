import { dbReady, getAllData, updateData, updateWorkspace, addWorkspace } from "./db.js";
import { addTask, getTasks, updateTask } from "./tasks.js";
import { addEvent, updateEvent, deleteEvent } from "./events.js";  
import { renderTasks, renderEvents } from "./ui.js";
import { fetchCategories, createCategory, editCategory, removeCategory } from "./categories.js";
import { ensureDefaultWorkspace, getCurrentWorkspaceId, setCurrentWorkspaceId } from "./workspaces.js";


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
// 🔷 Étape 3 & 4 : Rendu des tabs de workspaces (inchangé)
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
  container.innerHTML = "";

all.filter(w => !w.archived).forEach(ws => {
    const btn = document.createElement("button");
    btn.textContent = ws.name;
    btn.classList.add("workspace-tab");

    if (ws.id === currentId) btn.classList.add("active");
    if (ws.archived) btn.classList.add("archived");

    // Empêche de cliquer un flow archivé
    btn.addEventListener("click", async () => {
      if (ws.archived) return;
      if (ws.id === currentId) return;

      setCurrentWorkspaceId(ws.id);
      await renderTasks();
      await renderEvents();
      await renderWorkspaceTabs();
      await renderArchivedSection();
    });

    // Renommage au double clic
    btn.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const input = document.createElement("input");
      input.type = "text";
      input.value = ws.name;
      input.classList.add("workspace-tab-edit");

      container.replaceChild(input, btn);
      input.focus();
      input.select();

      const finalize = async (save) => {
        if (!save) {
          container.replaceChild(btn, input);
          return;
        }

        const newName = input.value.trim() || ws.name;
        if (newName !== ws.name) {
          await updateWorkspace({ ...ws, name: newName });
        }
        await renderWorkspaceTabs();
        await renderArchivedSection();
      };

      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") finalize(true);
        else if (ev.key === "Escape") finalize(false);
      });

      input.addEventListener("blur", () => finalize(true));
    });

    // Archiver/désarchiver au clic droit
    btn.addEventListener("contextmenu", async (e) => {
      e.preventDefault();

      const archiver = !ws.archived;
      const msg = archiver
        ? `Archiver le flow « ${ws.name} » ?`
        : `Désarchiver le flow « ${ws.name} » ?`;

      if (!confirm(msg)) return;

      await updateWorkspace({ ...ws, archived: archiver });

      // Si on archive le workspace actif → basculer
      const current = await getCurrentWorkspaceId();
      if (archiver && ws.id === current) {
        const others = all.filter(w => !w.archived && w.id !== ws.id);
        if (others.length > 0) setCurrentWorkspaceId(others[0].id);
      }

      await renderWorkspaceTabs();
      await renderArchivedSection();
      await renderTasks();
      await renderEvents();
    });

    container.appendChild(btn);
  });

  // Bouton Nouveau Flow
  const newBtn = document.createElement("button");
  newBtn.textContent = "+ Nouveau flow";
  newBtn.classList.add("workspace-tab", "workspace-tab-new");

  newBtn.addEventListener("click", async () => {
    const allWs = await getAllData("workspaces");
    const existingNames = new Set(allWs.map(w => w.name));

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

  container.appendChild(newBtn);
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
    row.textContent = ws.name;

    // Bouton désarchiver
    const btn = document.createElement("button");
    btn.textContent = "↩️ Désarchiver";
    btn.classList.add("unarchive-btn");

    btn.addEventListener("click", async () => {
      await updateWorkspace({ ...ws, archived: false });

      await renderWorkspaceTabs();
      await renderArchivedSection();
    });

    row.appendChild(btn);
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

    header.addEventListener("click", () => {
      section.classList.toggle("collapsed");
    });
  };

  makeSingleCollapsible(taskSection);
  makeSingleCollapsible(deadlinesSection);
  makeSingleCollapsible(eventsSection);
}
