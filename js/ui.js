import { getTasks, deleteTask, updateTask, addTask } from "./tasks.js";
import { getEvents, deleteEvent, addEvent, updateEvent } from "./events.js";
import { fetchCategories, createCategory, removeCategory, editCategory  } from "./categories.js";
import {
  getAllData,
  deleteData,
  getWorkspaces,
  addWorkspace,
  getCategories,
  addCategory,
} from "./db.js";
import { ensureDefaultWorkspace, getCurrentWorkspaceId } from "./workspaces.js";
import { normalizeHex } from "./colorNames.js";
import { createColorControlRow } from "./colorControls.js";
import {
  listFavoriteColors,
  moveFavoriteToArchive,
  restoreColorFromArchive,
  permanentDeleteArchivedColor,
  listArchivedColors,
} from "./favoritesStore.js";
import {
  listTrashedTasks,
  restoreTaskFromTrash,
  permanentDeleteTrashedTask,
  clearAllTrashedTasks,
} from "./trashStore.js";

let globalTaskUIClickInstalled = false;

function installGlobalTaskUIClickOnce() {
  if (globalTaskUIClickInstalled) return;
  globalTaskUIClickInstalled = true;
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".task-item input.task-due-input").forEach((dueInput) => {
      if (dueInput.classList.contains("hidden")) return;
      const right = dueInput.closest(".task-right");
      if (right?.contains(e.target)) return;
      const badge = right?.querySelector(".due-badge");
      if (!badge) return;
      badge.textContent = dueInput.value ? `⏳ ${dueInput.value}` : "+ ⏳";
      badge.style.display = "inline-block";
      dueInput.classList.add("hidden");
    });
    document.querySelectorAll(".task-item select.task-category-select").forEach((catSelect) => {
      if (catSelect.classList.contains("hidden")) return;
      const wrap = catSelect.closest(".task-category-wrapper");
      if (wrap?.contains(e.target)) return;
      catSelect.classList.add("hidden");
      const badge = wrap?.querySelector(".task-category");
      const editBtn = wrap?.querySelector(".edit-cat-btn");
      if (badge) badge.style.display = "inline-block";
      if (editBtn) editBtn.style.display = "inline-block";
    });
  });
}

installGlobalTaskUIClickOnce();

/** Dépassé → classe --overdue ; dans les 7 jours → --soon ; sinon défaut (gris). */
function applyEcheanceDateStyle(dateSpan, dayDate) {
  dateSpan.classList.remove("echeance-date--overdue", "echeance-date--soon");
  dateSpan.style.removeProperty("color");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dayDate);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    dateSpan.classList.add("echeance-date--overdue");
  } else if (diffDays <= 7) {
    dateSpan.classList.add("echeance-date--soon");
  }
}

// 🔧 Fonction utilitaire pour construire un <li> de tâche
function buildTaskItem(t, context = "main") {
  const li = document.createElement("li");
  li.classList.add("task-item");
  if (t.id != null) li.dataset.taskId = String(t.id);
  li.dataset.ffMounting = "1";

  // Colonne gauche : titre
  const left = document.createElement("div");
  left.classList.add("task-left");
  left.textContent = t.title;

  // Colonne droite : cote + catégorie + bouton
  const right = document.createElement("div");
  right.classList.add("task-right");

  // Sélecteur cote
  const select = document.createElement("select");
  for (let i = 10; i >= 1; i--) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = String(i);
    if (i === t.cote) opt.selected = true;
    select.appendChild(opt);
  }
  select.classList.add("task-cote-select");

  // --- Catégorie ---
  const categoryWrapper = document.createElement("div");
  categoryWrapper.classList.add("task-category-wrapper");

  const categoryBadge = document.createElement("span");
  categoryBadge.classList.add("task-category");

  function applyCategoryStyle(cat) {
    switch (cat) {
      case "Travail": categoryBadge.style.backgroundColor = "#1C2D49"; categoryBadge.style.color = "#fff"; break;
      case "Famille": categoryBadge.style.backgroundColor = "#8C3C3C"; categoryBadge.style.color = "#fff"; break;
      case "Maison": categoryBadge.style.backgroundColor = "#4B7355"; categoryBadge.style.color = "#fff"; break;
      case "Loisirs": categoryBadge.style.backgroundColor = "#B58B00"; categoryBadge.style.color = "#000"; break;
      case "Kung-Fu": categoryBadge.style.backgroundColor = "#8046A0"; categoryBadge.style.color = "#fff"; break;
      default: categoryBadge.style.backgroundColor = "#ECECEC"; categoryBadge.style.color = "#000";
    }
  }

  // Menu déroulant pour édition
  const catSelect = document.createElement("select");
  catSelect.classList.add("task-category-select");

// Chargement dynamique des catégories
(async () => {
  catSelect.dataset.ffProgrammatic = "1";
  try {
  const cats = await fetchCategories();

  // Option vide
  const optNone = document.createElement("option");
  optNone.value = "";
  optNone.textContent = "— Choisir une catégorie —";
  catSelect.appendChild(optNone);

  cats.forEach((c, index) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    if (t.category === c.id) opt.selected = true;
    opt.classList.add("option-normal"); // 🔹 ajout classe
    catSelect.appendChild(opt);
  
    // Ajouter un séparateur sauf après le dernier
    if (index < cats.length - 1) {
      const sep = document.createElement("option");
      sep.disabled = true;
      sep.textContent = "────────────────────────"; // ligne pleine largeur
      sep.classList.add("option-separator");
      catSelect.appendChild(sep);
    }
  });
  } finally {
    delete catSelect.dataset.ffProgrammatic;
  }
})();

  catSelect.classList.add("hidden");
// --- Échéance ---
const dueBadge = document.createElement("span");
dueBadge.classList.add("due-badge");

if (t.due) {
  dueBadge.textContent = `⏳ ${t.due}`;
} else {
  dueBadge.textContent = "+ ⏳";  // 👈 icône de plus + sablier
}

right.appendChild(dueBadge);
  // Bouton ✏️
  const editBtn = document.createElement("button");
  editBtn.textContent = "✏️";
  editBtn.classList.add("edit-cat-btn");

  // État initial
  (async () => {
    let badgeText = "Sans catégorie";
    let badgeColor = "#ECECEC";
    let badgeTextColor = "#000";
  
    if (t.category) {
      const cats = await fetchCategories();
      const cat = cats.find(c => c.id === t.category);
      if (cat) {
        badgeText = cat.name;
        badgeColor = cat.color;
        badgeTextColor = "#fff"; // tu pourrais raffiner pour contraste
      }
    }
  
    categoryBadge.textContent = badgeText;
    categoryBadge.style.backgroundColor = badgeColor;
    categoryBadge.style.color = badgeTextColor;
  })();
  categoryWrapper.appendChild(categoryBadge);
  categoryWrapper.appendChild(editBtn);
  categoryWrapper.appendChild(catSelect);
// --- Input date caché ---
const dueInput = document.createElement("input");
dueInput.type = "date";
dueInput.classList.add("hidden", "task-due-input");
if (t.due) {
  dueInput.value = t.due;
}

// Cliquer sur le badge = bascule vers input
dueBadge.onclick = (e) => {
  e.stopPropagation();
  dueBadge.style.display = "none";
  dueInput.classList.remove("hidden");
  dueInput.focus();
};

// Date : gérée par délégation (document) — évite onchange pendant appendChild + double renderTasks

right.appendChild(dueInput);

  // Actions édition catégorie
  editBtn.onclick = (e) => {
    e.stopPropagation();
    categoryBadge.style.display = "none";
    editBtn.style.display = "none";
    catSelect.classList.remove("hidden");
    catSelect.focus();
  };

  // Catégorie : délégation document

  // --- Bouton suppression ---
const del = document.createElement("button");
del.classList.add("delete-btn");
del.textContent = "❌";
del.onclick = () => deleteTask(t.id);


  // Assembler
  right.appendChild(select);
  right.appendChild(categoryWrapper);
  right.appendChild(del);

  li.appendChild(left);
  li.appendChild(right);

  queueMicrotask(() => {
    delete li.dataset.ffMounting;
  });

  return li;
}
// Registre des échéances masquées (par id de tâche / d'événement)
let echeancesMasquees = new Set();
let echeancesMasqueesEvents = new Set();

let taskFieldDelegationInstalled = false;

function installTaskFieldDelegationOnce() {
  if (taskFieldDelegationInstalled) return;
  taskFieldDelegationInstalled = true;

  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;

    const isCote = el.classList.contains("task-cote-select");
    const isCat = el.classList.contains("task-category-select");
    const isDue = el.classList.contains("task-due-input");
    if (!isCote && !isCat && !isDue) return;

    const li = el.closest(".task-item");
    if (!li?.dataset.taskId) return;
    if (li.dataset.ffMounting === "1") return;
    if (isCat && el.dataset.ffProgrammatic === "1") return;

    const taskId = li.dataset.taskId;
    const tasks = await getTasks();
    const task = tasks.find((tt) => String(tt.id) === taskId);
    if (!task) return;

    if (isCote) {
      task.cote = parseInt(el.value, 10);
    } else if (isCat) {
      task.category = el.value || null;
    } else if (isDue) {
      task.due = el.value || null;
      if (task.id != null) echeancesMasquees.delete(task.id);
    }

    await updateTask(task);
  });
}

installTaskFieldDelegationOnce();

// --- Rendu principal ---
export async function renderTasks() {
  const [tasks, eventsList] = await Promise.all([getTasks(), getEvents()]);
  const urgentList = document.querySelector("#urgent-list ul");
  const importantList = document.querySelector("#important-list ul");
  const urgentNotImportantList = document.querySelector("#urgent-notimportant-list ul");
  const notUrgentNotImportantList = document.querySelector("#noturgent-notimportant-list ul");
  const taskList = document.querySelector("#task-list ul");
  const deadlines = document.getElementById("deadlinesRoot");

  if (
    !urgentList ||
    !importantList ||
    !urgentNotImportantList ||
    !notUrgentNotImportantList ||
    !taskList ||
    !deadlines
  ) {
    return;
  }

  urgentList.innerHTML = "";
  importantList.innerHTML = "";
  urgentNotImportantList.innerHTML = "";
  notUrgentNotImportantList.innerHTML = "";
  taskList.innerHTML = "";

  // --- Quadrants + liste principale
  tasks
    .sort((a, b) => b.cote - a.cote)
    .forEach((t) => {
      if (t.cote >= 8) {
        urgentList.appendChild(buildTaskItem(t, "quad"));
      } else if (t.cote >= 5) {
        importantList.appendChild(buildTaskItem(t, "quad"));
      } else if (t.cote >= 3) {
        urgentNotImportantList.appendChild(buildTaskItem(t, "quad"));
      } else {
        notUrgentNotImportantList.appendChild(buildTaskItem(t, "quad"));
      }

      taskList.appendChild(buildTaskItem(t, "main"));
    });

  // --- Échéances : tâches avec date + rendez-vous (tri chronologique, groupés par mois)
  const taskRows = tasks
    .filter((t) => t.due && !echeancesMasquees.has(t.id))
    .map((t) => ({
      kind: "task",
      sortDate: new Date(t.due),
      task: t,
    }));

  const eventRows = eventsList
    .filter((ev) => !echeancesMasqueesEvents.has(ev.id))
    .map((ev) => ({
      kind: "event",
      sortDate: new Date(ev.date + " " + (ev.time || "00:00")),
      event: ev,
    }));

  const combined = [...taskRows, ...eventRows].sort(
    (a, b) => a.sortDate - b.sortDate
  );

  let currentMonth = "";
  let monthList = null;
  const deadlineFrag = document.createDocumentFragment();

  combined.forEach((item) => {
    const mois = item.sortDate.toLocaleString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    if (mois !== currentMonth) {
      currentMonth = mois;

      const header = document.createElement("div");
      header.classList.add("echeance-month");
      header.textContent = mois.charAt(0).toUpperCase() + mois.slice(1);
      deadlineFrag.appendChild(header);

      monthList = document.createElement("ul");
      deadlineFrag.appendChild(monthList);
    }

    const dl = document.createElement("li");
    dl.classList.add("echeance-item");

    const dateSpan = document.createElement("span");
    dateSpan.classList.add("echeance-date");

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("echeance-title");

    const hideBtn = document.createElement("button");
    hideBtn.textContent = "❌";
    hideBtn.classList.add("delete-btn");

    if (item.kind === "task") {
      const t = item.task;
      dateSpan.textContent = t.due;

      applyEcheanceDateStyle(dateSpan, t.due);

      titleSpan.textContent = t.title;

      hideBtn.onclick = () => {
        echeancesMasquees.add(t.id);
        void renderTasks();
      };
    } else {
      const ev = item.event;
      if (ev.time) {
        dateSpan.textContent = `${ev.date} à ${ev.time}`;
      } else {
        dateSpan.textContent = ev.date;
      }

      applyEcheanceDateStyle(dateSpan, ev.date);

      titleSpan.textContent = `📅 ${ev.title}`;

      hideBtn.onclick = () => {
        echeancesMasqueesEvents.add(ev.id);
        void renderTasks();
      };
    }

    const arrow = document.createElement("span");
    arrow.classList.add("echeance-arrow");
    arrow.textContent = "→";

    dl.appendChild(dateSpan);
    dl.appendChild(arrow);
    dl.appendChild(titleSpan);
    dl.appendChild(hideBtn);

    monthList.appendChild(dl);
  });

  deadlines.replaceChildren(deadlineFrag);
}




// --- Rendu événements ---
export async function renderEvents() {
  const events = await getEvents();
  const ul = document.querySelector("#events ul");
  ul.innerHTML = "";

  // Trier par date croissante
  const sorted = events
    .map(ev => ({ ...ev, dateObj: new Date(ev.date + " " + (ev.time || "00:00")) }))
    .sort((a, b) => a.dateObj - b.dateObj);

  let currentMonth = "";
  let monthList = null;

  sorted.forEach(ev => {
    const mois = ev.dateObj.toLocaleString("fr-FR", { month: "long", year: "numeric" });

    if (mois !== currentMonth) {
      currentMonth = mois;

      const header = document.createElement("div");
      header.classList.add("echeance-month");
      header.textContent = mois.charAt(0).toUpperCase() + mois.slice(1);
      ul.appendChild(header);

      monthList = document.createElement("ul");
      ul.appendChild(monthList);
    }

    const li = document.createElement("li");
    li.classList.add("event-item");

    // --- Ligne du haut ---
    const topRow = document.createElement("div");
    topRow.classList.add("event-top");

    // Date
    const dateSpan = document.createElement("span");
    dateSpan.classList.add("echeance-date");
    if (ev.time) {
      dateSpan.textContent = `${ev.date} à ${ev.time}`;
    } else {
      dateSpan.textContent = ev.date;
    }

    applyEcheanceDateStyle(dateSpan, ev.dateObj);

    // Bouton édition
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.classList.add("edit-cat-btn");
    editBtn.onclick = () => {
      const titleEl = document.getElementById("eventModalTitle");
      if (titleEl) titleEl.textContent = "Modifier un rendez-vous";
      document.getElementById("eventId").value = ev.id;
      document.getElementById("eventEditTitle").value = ev.title;
      document.getElementById("eventEditDate").value = ev.date;
      document.getElementById("eventEditTime").value = ev.time || "";
      document.getElementById("eventModal").classList.remove("hidden");
    };

    // Bouton suppression
    const delBtn = document.createElement("button");
    delBtn.textContent = "❌";
    delBtn.classList.add("delete-btn");
    delBtn.onclick = () => deleteEvent(ev.id);

    // Assembler ligne du haut
    const actions = document.createElement("div");
    actions.classList.add("event-actions");
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    topRow.appendChild(dateSpan);
    topRow.appendChild(actions);

    // --- Ligne du bas ---
    const bottomRow = document.createElement("div");
    bottomRow.classList.add("event-bottom");
    bottomRow.textContent = ev.title;

    // Assembler l'élément
    li.appendChild(topRow);
    li.appendChild(bottomRow);

    monthList.appendChild(li);
  });
}

function openEventModalForCreate() {
  const titleEl = document.getElementById("eventModalTitle");
  if (titleEl) titleEl.textContent = "Nouveau rendez-vous";
  document.getElementById("eventId").value = "";
  document.getElementById("eventEditTitle").value = "";
  document.getElementById("eventEditDate").value = "";
  document.getElementById("eventEditTime").value = "";
  document.getElementById("eventModal").classList.remove("hidden");
}

function closeEventModal() {
  const m = document.getElementById("eventModal");
  if (m) m.classList.add("hidden");
}

const openEventModalBtn = document.getElementById("openEventModal");
const eventEditForm = document.getElementById("eventEditForm");
const closeEventModalEl = document.getElementById("closeEventModal");
const eventModalEl = document.getElementById("eventModal");

if (openEventModalBtn) {
  openEventModalBtn.addEventListener("click", openEventModalForCreate);
}

if (closeEventModalEl) {
  closeEventModalEl.addEventListener("click", closeEventModal);
}

if (eventModalEl) {
  eventModalEl.addEventListener("click", (e) => {
    if (e.target === eventModalEl) closeEventModal();
  });
}

if (eventEditForm) {
  eventEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idRaw = document.getElementById("eventId").value;
    const title = document.getElementById("eventEditTitle").value.trim();
    const date = document.getElementById("eventEditDate").value;
    const timeRaw = document.getElementById("eventEditTime").value;
    const time = timeRaw || null;

    if (!title) {
      alert("Le titre est requis");
      return;
    }
    if (!date) {
      alert("La date est requise");
      return;
    }

    if (idRaw) {
      const events = await getEvents();
      const existing = events.find((x) => x.id === Number(idRaw));
      if (!existing) {
        alert("Événement introuvable.");
        return;
      }
      await updateEvent({ ...existing, title, date, time });
    } else {
      await addEvent({ title, date, time });
    }

    closeEventModal();
  });
}






// --- Menu déroulant pour importation JSON ---
const importFileInput = document.getElementById("importFile");
const btnImport = document.getElementById("btnImport");
const importMenu = document.getElementById("importMenu");

btnImport.addEventListener("click", () => {
  importMenu.classList.toggle("hidden");
});

// Fermer si clic en dehors
document.addEventListener("click", (e) => {
  if (!e.target.closest(".import-wrapper")) {
    importMenu.classList.add("hidden");
  }
});

// Fusionner / Importer dans ce flow / Remplacer tout
document.querySelectorAll(".import-option").forEach(option => {
  option.addEventListener("click", () => {
    const mode = option.dataset.mode; // "fusion" | "dans-ce-flow" | "remplacer"
    importMenu.classList.add("hidden");

    // stocke le mode et ouvre le sélecteur de fichier
    importFileInput.dataset.mode = mode;
    importFileInput.click();
  });
});

// Quand on a choisi un fichier
importFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const contenu = event.target.result;
    await importerJSON(contenu, importFileInput.dataset.mode);
    importFileInput.value = ""; // reset pour pouvoir réutiliser le même fichier
  };
  reader.readAsText(file);
});

// 🔧 Vide complètement les stores concernés (mode "remplacer")
async function viderBaseDeDonnees({ withWorkspaces, withCategories }) {
  // TÂCHES (tous workspaces)
  const allTasks = await getAllData("tasks");
  for (const t of allTasks) {
    await deleteData("tasks", t.id);
  }

  // ÉVÉNEMENTS (tous workspaces)
  const allEvents = await getAllData("events");
  for (const e of allEvents) {
    await deleteData("events", e.id);
  }

  if (withCategories) {
    const allCats = await getAllData("categories");
    for (const c of allCats) {
      await deleteData("categories", c.id);
    }
  }

  if (withWorkspaces) {
    const allWs = await getAllData("workspaces");
    for (const w of allWs) {
      await deleteData("workspaces", w.id);
    }
  }

  for (const r of await getAllData("trashedTasks")) {
    await deleteData("trashedTasks", r.id);
  }
  for (const r of await getAllData("favoriteColors")) {
    await deleteData("favoriteColors", r.id);
  }
  for (const r of await getAllData("colorArchive")) {
    await deleteData("colorArchive", r.id);
  }
}

// 🔧 importer JSON : fusion / import dans le flow actuel / remplacement
export async function importerJSON(contenu, mode = "fusion") {
  try {
    const data = JSON.parse(contenu);

    const hasWorkspaces = Array.isArray(data.workspaces);
    const hasCategories = Array.isArray(data.categories);
    const hasTasks = Array.isArray(data.tasks);
    const hasEvents = Array.isArray(data.events);

    // Seul « Importer dans ce flow » limite tâches / RDV au flow ouvert.
    if (mode === "remplacer") {
      let msg =
        "Remplacer tout efface toutes les tâches et tous les rendez-vous, pour tous les flows.";
      if (hasCategories) {
        msg += "\n\nToutes les catégories seront aussi effacées.";
      }
      if (hasWorkspaces) {
        msg += "\n\nTous les flows seront supprimés puis remplacés par ceux du fichier.";
      } else {
        msg +=
          "\n\nLes flows ne sont pas supprimés (fichier sans liste de flows) : seules les tâches et les RDV sont vidés.";
      }
      msg += "\n\nContinuer ?";
      if (!confirm(msg)) return;
    }

    if (mode === "fusion" && hasWorkspaces) {
      const msg =
        "Fusionner avec un fichier multi-flows : des tâches ou rendez-vous peuvent être ajoutés dans d’autres flows que celui ouvert, et de nouveaux flows peuvent apparaître dans le menu.\n\n" +
        "Pour que tout aille uniquement dans le flow actuellement ouvert, annulez et choisissez « Importer dans ce flow ».\n\n" +
        "Continuer ?";
      if (!confirm(msg)) return;
    }

    const fusionLike = mode === "fusion" || mode === "dans-ce-flow";

    /** Évite les erreurs IndexedDB (clé `id` déjà présente) en fusion / dans-ce-flow. */
    const withoutStoredId = (row) => {
      const { id, ...rest } = row;
      return rest;
    };

    // Sécurité : si ancien format { tasks, events } sans workspaces/categories
    // on ne touche pas aux stores "workspaces" et "categories" en mode "remplacer".
    if (mode === "remplacer") {
      await viderBaseDeDonnees({
        withWorkspaces: !!hasWorkspaces,
        withCategories: !!hasCategories,
      });
    }

    // ---- WORKSPACES ----
    const wsIdMap = {}; // id du JSON -> id local

    if (mode === "dans-ce-flow") {
      // Tout le contenu ira dans le flow sélectionné : on ne recrée pas les flows du fichier
      await ensureDefaultWorkspace();
    } else if (hasWorkspaces) {
      const existingWs = await getWorkspaces();

      if (mode === "fusion") {
        for (const ws of data.workspaces) {
          const sameId = existingWs.find(w => w.id === ws.id);
          if (sameId) {
            wsIdMap[ws.id] = sameId.id;
          } else {
            await addWorkspace(ws);
            wsIdMap[ws.id] = ws.id;
          }
        }
      } else {
        for (const ws of data.workspaces) {
          await addWorkspace(ws);
          wsIdMap[ws.id] = ws.id;
        }
      }
    } else {
      await ensureDefaultWorkspace();
    }

    const importTargetWsId = await getCurrentWorkspaceId();

    // ---- CATEGORIES ----
    if (hasCategories) {
      const existingCats = await getCategories();

      for (const cat of data.categories) {
        if (fusionLike) {
          const sameId = existingCats.find(c => c.id === cat.id);
          if (sameId) continue;
        }
        await addCategory({
          ...cat,
          workspaceId:
            mode === "dans-ce-flow"
              ? importTargetWsId
              : (cat.workspaceId ?? importTargetWsId),
        });
      }
    }

    // ---- TÂCHES ----
    if (hasTasks) {
      let existingTasks = await getAllData("tasks");

      for (const raw of data.tasks) {
        let targetWsId = importTargetWsId;

        if (mode !== "dans-ce-flow") {
          if (raw.workspaceId && wsIdMap[raw.workspaceId]) {
            targetWsId = wsIdMap[raw.workspaceId];
          } else if (raw.workspaceId && !hasWorkspaces) {
            targetWsId = importTargetWsId;
          }
        }

        const taskPayload = fusionLike ? withoutStoredId(raw) : raw;
        const t = {
          ...taskPayload,
          workspaceId: targetWsId,
        };

        if (fusionLike) {
          const exists = existingTasks.some(
            ex =>
              ex.title === t.title &&
              ex.workspaceId === t.workspaceId &&
              (ex.due || null) === (t.due || null)
          );
          if (exists) continue;

          await addTask(t);
          existingTasks.push(t);
        } else {
          await addTask(t);
        }
      }
    }

    // ---- ÉVÉNEMENTS ----
    if (hasEvents) {
      let existingEvents = await getAllData("events");

      for (const rawEv of data.events) {
        let targetWsId = importTargetWsId;

        if (mode !== "dans-ce-flow") {
          if (rawEv.workspaceId && wsIdMap[rawEv.workspaceId]) {
            targetWsId = wsIdMap[rawEv.workspaceId];
          } else if (rawEv.workspaceId && !hasWorkspaces) {
            targetWsId = importTargetWsId;
          }
        }

        const eventPayload = fusionLike ? withoutStoredId(rawEv) : rawEv;
        const ev = {
          ...eventPayload,
          workspaceId: targetWsId,
        };

        if (fusionLike) {
          const exists = existingEvents.some(
            ex =>
              ex.title === ev.title &&
              ex.workspaceId === ev.workspaceId &&
              (ex.date || null) === (ev.date || null) &&
              (ex.time || "") === (ev.time || "")
          );
          if (exists) continue;

          await addEvent(ev);
          existingEvents.push(ev);
        } else {
          await addEvent(ev);
        }
      }
    }

    await renderTasks();
    await renderEvents();

    window.dispatchEvent(new CustomEvent("focusflow-workspaces-changed"));

    const modeLabel =
      mode === "fusion"
        ? "fusion multi-flows sans doublons"
        : mode === "dans-ce-flow"
          ? "import dans le flow actuel"
          : "remplacement total des données concernées";

    alert(`✅ Import terminé (${modeLabel})`);
  } catch (err) {
    console.error("Erreur import:", err);
    alert("❌ Fichier invalide ou erreur d’import.");
  }
}
// --- EXPORT JSON multi-flows ---
const exportBtn = document.getElementById("exportBtn");

if (exportBtn) {
  exportBtn.addEventListener("click", async () => {
    try {
      // On va chercher TOUTES les données, tous flows confondus
      const [workspaces, categories, tasks, events, trashedTasks, favoriteColors, colorArchive] =
        await Promise.all([
          getWorkspaces(),
          getAllData("categories"),
          getAllData("tasks"),
          getAllData("events"),
          getAllData("trashedTasks"),
          getAllData("favoriteColors"),
          getAllData("colorArchive"),
        ]);

      const payload = {
        workspaces,
        categories,
        tasks,
        events,
        trashedTasks,
        favoriteColors,
        colorArchive,
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      a.href = url;
      a.download = `focusflow-multiflows-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export :", err);
      alert("❌ Erreur lors de l’export des données.");
    }
  });
}
// ---------------------------------------------------------
// --- GESTIONNAIRE DE CATÉGORIES (ouvrir / fermer / lister)
// ---------------------------------------------------------

const btnManageCategories = document.getElementById("btnManageCategories");
const modalCategories = document.getElementById("modalCategories");
const closeCategories = document.getElementById("closeCategories");

const categoriesList = document.getElementById("categoriesList");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const newCategoryName = document.getElementById("newCategoryName");

let favoriteModalApply = null;
let addCategoryColorRow = null;
let taskNewCategoryColorRow = null;

function ensureAddCategoryColorRow() {
  const mount = document.getElementById("newCategoryColorMount");
  if (!mount || addCategoryColorRow) return;
  addCategoryColorRow = createColorControlRow("#888888", {
    onOpenPalette: (apply) => openFavoriteColorsModal(apply),
  });
  mount.appendChild(addCategoryColorRow.wrap);
}

function ensureTaskNewCategoryColorRow() {
  const mount = document.getElementById("taskNewCategoryColorMount");
  if (!mount || taskNewCategoryColorRow) return;
  taskNewCategoryColorRow = createColorControlRow("#6699aa", {
    onOpenPalette: (apply) => openFavoriteColorsModal(apply),
  });
  mount.appendChild(taskNewCategoryColorRow.wrap);
}

export function openFavoriteColorsModal(onPick) {
  favoriteModalApply = onPick;
  const modal = document.getElementById("favoriteColorsModal");
  void renderFavoriteColorsModalBody();
  modal?.classList.remove("hidden");
}

async function renderFavoriteColorsModalBody() {
  const body = document.getElementById("favoriteColorsModalBody");
  const empty = document.getElementById("favoriteColorsEmpty");
  if (!body || !empty) return;
  const list = await listFavoriteColors();
  body.innerHTML = "";
  if (list.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  for (const fav of list) {
    const item = document.createElement("div");
    item.className = "favorite-color-item";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "favorite-color-card";
    card.style.setProperty("--fav-swatch", fav.hex);

    const sw = document.createElement("span");
    sw.className = "favorite-color-swatch";
    const nm = document.createElement("span");
    nm.className = "favorite-color-name";
    nm.textContent = fav.name;
    const hx = document.createElement("span");
    hx.className = "favorite-color-hex";
    hx.textContent = fav.hex;
    card.appendChild(sw);
    card.appendChild(nm);
    card.appendChild(hx);
    card.addEventListener("click", () => {
      favoriteModalApply?.(fav.hex);
      document.getElementById("favoriteColorsModal")?.classList.add("hidden");
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-favorite-archive";
    del.textContent = "Retirer des favoris";
    del.title = "Retire de la liste des favoris (la couleur reste utilisable ailleurs)";
    del.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await moveFavoriteToArchive(fav.id);
      await renderFavoriteColorsModalBody();
    });

    item.appendChild(card);
    item.appendChild(del);
    body.appendChild(item);
  }
}

export async function openTrashModal() {
  await renderTrashModalContent();
  document.getElementById("trashModal")?.classList.remove("hidden");
}

async function renderTrashModalContent() {
  const tasksUl = document.getElementById("trashTasksList");
  const colorsUl = document.getElementById("trashColorsList");
  const emptyT = document.getElementById("trashTasksEmpty");
  const emptyC = document.getElementById("trashColorsEmpty");
  if (!tasksUl || !colorsUl) return;

  const tRows = await listTrashedTasks();
  const cRows = await listArchivedColors();

  tasksUl.innerHTML = "";
  emptyT.classList.toggle("hidden", tRows.length > 0);
  for (const row of tRows) {
    const t = row.taskSnapshot;
    const li = document.createElement("li");
    li.className = "trash-item";
    const title = document.createElement("span");
    title.className = "trash-item-label";
    title.textContent = t?.title || "(sans titre)";
    const actions = document.createElement("div");
    actions.className = "trash-item-actions";
    const rest = document.createElement("button");
    rest.type = "button";
    rest.className = "btn-trash-restore";
    rest.textContent = "Restaurer";
    rest.onclick = async () => {
      await restoreTaskFromTrash(row.id);
      await renderTrashModalContent();
      await renderTasks();
    };
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-trash-delete";
    del.textContent = "Supprimer";
    del.onclick = async () => {
      if (!confirm("Supprimer définitivement cette tâche ?")) return;
      await permanentDeleteTrashedTask(row.id);
      await renderTrashModalContent();
    };
    actions.appendChild(rest);
    actions.appendChild(del);
    li.appendChild(title);
    li.appendChild(actions);
    tasksUl.appendChild(li);
  }

  colorsUl.innerHTML = "";
  emptyC.classList.toggle("hidden", cRows.length > 0);
  for (const row of cRows) {
    const li = document.createElement("li");
    li.className = "trash-item trash-item--color";
    li.style.setProperty("--trash-swatch", row.hex);
    const label = document.createElement("span");
    label.className = "trash-item-label";
    label.textContent = `${row.name} · ${row.hex}`;
    const actions = document.createElement("div");
    actions.className = "trash-item-actions";
    const rest = document.createElement("button");
    rest.type = "button";
    rest.className = "btn-trash-restore";
    rest.textContent = "Restaurer";
    rest.onclick = async () => {
      await restoreColorFromArchive(row.id);
      await renderTrashModalContent();
    };
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-trash-delete";
    del.textContent = "Effacer";
    del.title = "Suppression définitive";
    del.onclick = async () => {
      if (!confirm("Supprimer définitivement cette couleur de l’archive ?")) return;
      await permanentDeleteArchivedColor(row.id);
      await renderTrashModalContent();
    };
    actions.appendChild(rest);
    actions.appendChild(del);
    li.appendChild(label);
    li.appendChild(actions);
    colorsUl.appendChild(li);
  }
}

// --- Affiche la liste actuelle des catégories ---
async function renderCategoryManager() {
  const cats = await fetchCategories();
  categoriesList.innerHTML = "";

  cats.forEach((cat) => {
    const li = document.createElement("li");
    li.className = "category-edit-row";

    const left = document.createElement("div");
    left.className = "category-edit-left";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "category-edit-name";
    nameInput.value = cat.name;

    const colorRow = createColorControlRow(cat.color || "#888888", {
      onOpenPalette: (apply) => openFavoriteColorsModal(apply),
    });
    left.appendChild(nameInput);
    left.appendChild(colorRow.wrap);

    const right = document.createElement("div");
    right.className = "category-edit-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "💾";
    saveBtn.title = "Enregistrer";
    saveBtn.addEventListener("click", async () => {
      const newName = nameInput.value.trim();
      const newColor = colorRow.getHex() || cat.color;
      if (!newName) {
        alert("Le nom de la catégorie est requis");
        return;
      }
      await editCategory({ ...cat, name: newName, color: newColor });
      await renderCategoryManager();
      await renderTasks();
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "❌";
    delBtn.title = "Supprimer";
    delBtn.addEventListener("click", async () => {
      await removeCategory(cat.id);
      await renderCategoryManager();
      await renderTasks();
    });

    right.appendChild(saveBtn);
    right.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(right);

    categoriesList.appendChild(li);
  });
}

function syncTaskCategoryMode() {
  const existing =
    document.querySelector('input[name="taskCatMode"]:checked')?.value === "existing";
  document.getElementById("taskCategoryExistingWrap")?.classList.toggle("hidden", !existing);
  document.getElementById("taskCategoryNewWrap")?.classList.toggle("hidden", existing);
  const sel = document.getElementById("taskCategory");
  const nameIn = document.getElementById("taskNewCategoryName");
  if (existing) {
    sel?.setAttribute("required", "");
    nameIn?.removeAttribute("required");
  } else {
    sel?.removeAttribute("required");
    nameIn?.setAttribute("required", "");
  }
}

// --- Ouvrir modale ---
if (btnManageCategories) {
  btnManageCategories.addEventListener("click", async () => {
    ensureAddCategoryColorRow();
    await renderCategoryManager();
    modalCategories.classList.remove("hidden");
  });
}

// --- Fermer modale ---
if (closeCategories) {
  closeCategories.addEventListener("click", () => {
    modalCategories.classList.add("hidden");
  });
}

// --- Ajouter une catégorie ---
if (addCategoryBtn) {
  addCategoryBtn.addEventListener("click", async () => {
    const name = newCategoryName.value.trim();
    ensureAddCategoryColorRow();
    const color = addCategoryColorRow?.getHex();

    if (!name) {
      alert("Le nom de la catégorie est requis");
      return;
    }
    if (!color) {
      alert("Indiquez une couleur hex valide");
      return;
    }

    await createCategory(name, color);

    newCategoryName.value = "";
    addCategoryColorRow?.setHex("#888888");

    await renderCategoryManager();
    await renderTasks();
  });
}

// ---------------------------------------------------------
// --- Modale nouvelle tâche (bouton ➕ + formulaire)
// ---------------------------------------------------------
/** Champ cote : bouton = chiffre seul ; liste custom = libellés complets. */
function syncTaskCoteDisplay() {
  const hidden = document.getElementById("taskCote");
  const trigger = document.getElementById("taskCoteTrigger");
  const menu = document.getElementById("taskCoteMenu");
  if (!hidden || !trigger) return;
  const v = hidden.value;
  trigger.textContent = v ? v : "Choisir…";
  if (menu) {
    menu.querySelectorAll('[role="option"]').forEach((li) => {
      li.setAttribute("aria-selected", li.dataset.value === v ? "true" : "false");
    });
  }
}

function setupTaskCoteCustomDropdown() {
  const wrap = document.getElementById("taskCoteWrap");
  const trigger = document.getElementById("taskCoteTrigger");
  const menu = document.getElementById("taskCoteMenu");
  const hidden = document.getElementById("taskCote");
  if (!wrap || !trigger || !menu || !hidden) return;

  function closeMenu() {
    menu.classList.add("hidden");
    trigger.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    menu.classList.remove("hidden");
    trigger.setAttribute("aria-expanded", "true");
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.classList.contains("hidden")) openMenu();
    else closeMenu();
  });

  menu.querySelectorAll('[role="option"]').forEach((li) => {
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      const v = li.dataset.value;
      if (v === undefined) return;
      hidden.value = v;
      syncTaskCoteDisplay();
      closeMenu();
    });
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.classList.contains("hidden")) {
      closeMenu();
    }
  });
}

const openTaskModalBtn = document.getElementById("openTaskModal");
const taskModal = document.getElementById("taskModal");
const closeTaskModalEl = document.getElementById("closeTaskModal");
const taskForm = document.getElementById("taskForm");
const taskCategorySelect = document.getElementById("taskCategory");

setupTaskCoteCustomDropdown();

async function fillTaskModalCategories() {
  if (!taskCategorySelect) return;
  const cats = await fetchCategories();
  taskCategorySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = "— Choisir une catégorie —";
  taskCategorySelect.appendChild(placeholder);
  cats.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    taskCategorySelect.appendChild(opt);
  });
}

function closeTaskModal() {
  taskModal?.classList.add("hidden");
  taskForm?.reset();
  syncTaskCoteDisplay();
  const existingRadio = document.querySelector('input[name="taskCatMode"][value="existing"]');
  if (existingRadio) existingRadio.checked = true;
  syncTaskCategoryMode();
  const newCatName = document.getElementById("taskNewCategoryName");
  if (newCatName) newCatName.value = "";
  taskNewCategoryColorRow?.setHex("#6699aa");
}

if (openTaskModalBtn && taskModal) {
  openTaskModalBtn.addEventListener("click", async () => {
    ensureTaskNewCategoryColorRow();
    await fillTaskModalCategories();
    syncTaskCategoryMode();
    syncTaskCoteDisplay();
    taskModal.classList.remove("hidden");
  });
}

document.querySelectorAll('input[name="taskCatMode"]').forEach((r) => {
  r.addEventListener("change", syncTaskCategoryMode);
});

if (closeTaskModalEl) {
  closeTaskModalEl.addEventListener("click", closeTaskModal);
}

if (taskModal) {
  taskModal.addEventListener("click", (e) => {
    if (e.target === taskModal) closeTaskModal();
  });
}

document.getElementById("closeFavoriteColorsModal")?.addEventListener("click", () => {
  document.getElementById("favoriteColorsModal")?.classList.add("hidden");
});

document.getElementById("favoriteColorsModal")?.addEventListener("click", (e) => {
  if (e.target?.id === "favoriteColorsModal") {
    document.getElementById("favoriteColorsModal")?.classList.add("hidden");
  }
});

document.getElementById("closeTrashModal")?.addEventListener("click", () => {
  document.getElementById("trashModal")?.classList.add("hidden");
});

document.getElementById("trashModal")?.addEventListener("click", (e) => {
  if (e.target?.id === "trashModal") {
    document.getElementById("trashModal")?.classList.add("hidden");
  }
});

document.getElementById("btnEmptyTrash")?.addEventListener("click", async () => {
  if (
    !confirm(
      "Vider toute la corbeille ? Les tâches et les couleurs archivées seront définitivement supprimées."
    )
  ) {
    return;
  }
  await clearAllTrashedTasks();
  const archived = await listArchivedColors();
  for (const a of archived) {
    await permanentDeleteArchivedColor(a.id);
  }
  await renderTrashModalContent();
  await renderTasks();
});

document.getElementById("btnTrash")?.addEventListener("click", () => {
  void openTrashModal();
});

if (taskForm) {
  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("taskTitle")?.value.trim();
    const coteRaw = document.getElementById("taskCote")?.value;
    const due = document.getElementById("taskDue")?.value || null;
    const mode = document.querySelector('input[name="taskCatMode"]:checked')?.value;

    if (!title) {
      alert("Le titre est requis");
      return;
    }
    const cote = parseInt(coteRaw, 10);
    if (!coteRaw || Number.isNaN(cote)) {
      alert("Choisissez une cote");
      return;
    }

    let categoryId = taskCategorySelect?.value;
    if (mode === "new") {
      const n = document.getElementById("taskNewCategoryName")?.value.trim();
      ensureTaskNewCategoryColorRow();
      const hex = taskNewCategoryColorRow?.getHex();
      if (!n) {
        alert("Indiquez un nom pour la nouvelle catégorie");
        return;
      }
      if (!hex) {
        alert("Indiquez une couleur hex valide pour la catégorie");
        return;
      }
      categoryId = await createCategory(n, hex);
    } else {
      if (!categoryId) {
        alert("Choisissez une catégorie");
        return;
      }
    }

    await addTask({
      title,
      cote,
      due,
      category: categoryId,
    });

    closeTaskModal();
  });
}
