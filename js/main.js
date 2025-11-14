import { dbReady, getAllData, updateData, updateWorkspace } from "./db.js";
import { addTask, getTasks, updateTask } from "./tasks.js";
import { addEvent, updateEvent, deleteEvent } from "./events.js";  
import { renderTasks, renderEvents } from "./ui.js";
import { fetchCategories, createCategory, editCategory, removeCategory } from "./categories.js";
import { ensureDefaultWorkspace, getCurrentWorkspaceId, setCurrentWorkspaceId } from "./workspaces.js";

// 🔹 Migration : assigne un workspaceId aux tâches / événements / catégories qui n'en ont pas encore
async function migrerWorkspaceIdSiNecessaire() {
  const wsId = await getCurrentWorkspaceId();

  // 🔸 TÂCHES
  const tasks = await getAllData("tasks");
  for (const t of tasks) {
    if (!("workspaceId" in t) || t.workspaceId == null) {
      t.cote = t.cote ?? 5; // sécurité si données plus anciennes
      t.workspaceId = wsId;
      await updateData("tasks", t);
    }
  }

  // 🔸 ÉVÉNEMENTS
  const events = await getAllData("events");
  for (const e of events) {
    if (!("workspaceId" in e) || e.workspaceId == null) {
      e.workspaceId = wsId;
      await updateData("events", e);
    }
  }

  // 🔸 CATÉGORIES
  const categories = await getAllData("categories");
  for (const c of categories) {
    if (!("workspaceId" in c) || c.workspaceId == null) {
      c.workspaceId = wsId;
      await updateData("categories", c);
    }
  }
}

// 🔵 ÉTAPE 3.2 / 4.1 — Rendu des onglets de workspaces + renommage inline
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

  // On filtre les non archivés, sinon on prend tout
  const active = all.filter(w => !w.archived);
  const list = active.length > 0 ? active : all;

  list.forEach(ws => {
    const btn = document.createElement("button");
    btn.textContent = ws.name;
    btn.classList.add("workspace-tab");
    if (ws.id === currentId) {
      btn.classList.add("active");
    }

    // ✅ Changer de workspace au clic
    btn.addEventListener("click", async () => {
      if (ws.id === currentId) return; // pas de travail inutile

      setCurrentWorkspaceId(ws.id);
      await renderTasks();
      await renderEvents();
      await renderWorkspaceTabs(); // rafraîchir l'état "actif"
    });

    // ✏️ Renommage inline au double-clic
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
          // Annulation → on remet le bouton original
          container.replaceChild(btn, input);
          return;
        }

        const newName = input.value.trim() || ws.name;
        if (newName !== ws.name) {
          const updated = { ...ws, name: newName };
          await updateWorkspace(updated);
        }

        await renderWorkspaceTabs();
      };

      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          finalize(true);
        } else if (ev.key === "Escape") {
          finalize(false);
        }
      });

      input.addEventListener("blur", () => {
        finalize(true);
      });
    });

    container.appendChild(btn);
  });
}

// Attendre que DB soit prête
await dbReady;
// S'assurer qu'il existe au moins un workspace ("Général")
// et qu'un currentWorkspaceId est cohérent
await ensureDefaultWorkspace();
await migrerWorkspaceIdSiNecessaire();
await renderWorkspaceTabs();
renderTasks();
renderEvents();
initCollapsibleEisenhower();

// Ajouter tâche
document.querySelector("#taskForm").onsubmit = async (e) => {
  e.preventDefault();
  const title = document.querySelector("#taskTitle").value;
  const cote = parseInt(document.querySelector("#taskCote").value);
  const due = document.querySelector("#taskDue").value || null;
  const categoryId = document.querySelector("#taskCategory").value || null;

  await addTask({ title, cote, due, category: categoryId });

  e.target.reset();
  taskModal.classList.add("hidden");
};

const categorySelect = document.querySelector("#taskCategory");
const categoryWrapper = document.querySelector("#categoryWrapper");

categorySelect.onchange = async () => {
  const selectedId = categorySelect.value;
  if (!selectedId) return;

  const cats = await fetchCategories();
  const cat = cats.find(c => c.id === selectedId);

  // Création du badge
  const badge = document.createElement("span");
  badge.classList.add("task-category");

  if (cat) {
    badge.textContent = cat.name;
    badge.style.backgroundColor = cat.color;
    badge.style.color = "#fff";
  } else {
    badge.textContent = "Sans catégorie";
    badge.style.backgroundColor = "#ECECEC";
    badge.style.color = "#000";
  }

  // Bouton ❌
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "×";
  removeBtn.classList.add("remove-cat-btn");
  removeBtn.onclick = () => {
    badge.remove();
    removeBtn.remove();
    categorySelect.style.display = "inline-block"; // réafficher le select
    categorySelect.value = ""; // reset
  };

  // Remplacer le select par badge + X
  categorySelect.style.display = "none";
  categoryWrapper.appendChild(badge);
  categoryWrapper.appendChild(removeBtn);
};

// Ajouter événement
document.querySelector("#eventForm").onsubmit = async (e) => {
  e.preventDefault();
  const title = document.querySelector("#eventTitle").value;
  const date = document.querySelector("#eventDate").value;
  const time = document.querySelector("#eventTime").value || "";

  await addEvent({ title, date, time });
  e.target.reset();
};

// Export / Import
document.querySelector("#exportBtn").onclick = async () => {
  const tasks = await (await import("./tasks.js")).getTasks();
  const events = await (await import("./events.js")).getEvents();
  const blob = new Blob([JSON.stringify({ tasks, events })], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "focusflow-data.json";
  a.click();
};

// Gestion de la modale de tâche
const taskModal = document.getElementById("taskModal");
const openTaskModal = document.getElementById("openTaskModal");
const closeTaskModal = document.getElementById("closeTaskModal");

openTaskModal.addEventListener("click", async () => {
  await chargerCategoriesDansSelect(); // 🔹 recharge la liste depuis IndexedDB
  taskModal.classList.remove("hidden");
});

closeTaskModal.addEventListener("click", () => {
  taskModal.classList.add("hidden");
});

// Fermer en cliquant en dehors du contenu
window.addEventListener("click", (e) => {
  if (e.target === taskModal) {
    taskModal.classList.add("hidden");
  }
});

// Remplir le <select> des catégories
export async function chargerCategoriesDansSelect() {
  const select = document.getElementById("taskCategory");
  select.innerHTML = "";

  // Option "Sans catégorie"
  const optNone = document.createElement("option");
  optNone.value = "";
  optNone.textContent = "Sans catégorie";
  optNone.classList.add("option-normal");
  select.appendChild(optNone);

  // Catégories depuis IndexedDB
  const cats = await fetchCategories();
  cats.forEach((c, index) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    opt.classList.add("option-normal");
    select.appendChild(opt);

    // 🔹 Séparateur (sauf après le dernier)
    if (index < cats.length - 1) {
      const sep = document.createElement("option");
      sep.disabled = true;
      sep.textContent = "────────────────────────";
      sep.classList.add("option-separator");
      select.appendChild(sep);
    }
  });

  // ✅ applique la classe sur le <select>
  select.classList.add("task-category-select");
}

// --- Gestion modale Catégories ---
const modalCategories = document.getElementById("modalCategories");
const btnManageCategories = document.getElementById("btnManageCategories");
const closeCategories = document.getElementById("closeCategories");

btnManageCategories.addEventListener("click", () => {
  modalCategories.classList.remove("hidden");
});

closeCategories.addEventListener("click", () => {
  modalCategories.classList.add("hidden");
});

window.addEventListener("click", (e) => {
  if (e.target === modalCategories) {
    modalCategories.classList.add("hidden");
  }
});

async function afficherCategories() {
  const list = document.getElementById("categoriesList");
  list.innerHTML = "";

  const cats = await fetchCategories();
  cats.forEach(c => {
    const li = document.createElement("li");

    // Pastille couleur
    const colorPreview = document.createElement("span");
    colorPreview.style.display = "inline-block";
    colorPreview.style.width = "16px";
    colorPreview.style.height = "16px";
    colorPreview.style.marginRight = "8px";
    colorPreview.style.borderRadius = "3px";

    // Input nom
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = c.name;
    nameInput.classList.add("cat-name-input");

    // Input couleur
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = c.color;
    colorInput.classList.add("cat-color-input");
    colorInput.style.marginLeft = "8px";

    // Bouton sauvegarder
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "💾";
    saveBtn.classList.add("save-cat-btn");
    saveBtn.style.marginLeft = "8px";

    saveBtn.onclick = async () => {
      const newName = nameInput.value.trim();
      const newColor = colorInput.value;

      if (!newName) {
        alert("Le nom de la catégorie ne peut pas être vide.");
        return;
      }

      await editCategory({ ...c, name: newName, color: newColor });
      afficherCategories(); // rafraîchir
    };

    // Bouton suppression
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.classList.add("delete-cat-btn");
    deleteBtn.style.marginLeft = "8px";

    deleteBtn.onclick = async () => {
      if (!confirm(`Supprimer la catégorie "${c.name}" ?`)) return;

      // 1. Supprimer la catégorie en DB
      await removeCategory(c.id);

      // 2. Mettre à jour toutes les tâches concernées
      const tasks = await getTasks();
      for (const task of tasks) {
        if (task.category === c.id) {
          task.category = null; // devient Sans catégorie
          await updateTask(task);
        }
      }

      // 3. Rafraîchir l’affichage
      afficherCategories();
      renderTasks();
    };

    // Assemble
    li.appendChild(colorPreview);
    li.appendChild(nameInput);
    li.appendChild(colorInput);
    li.appendChild(saveBtn);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

btnManageCategories.addEventListener("click", () => {
  afficherCategories();
  modalCategories.classList.remove("hidden");
});

const addCategoryBtn = document.getElementById("addCategoryBtn");
const newCategoryName = document.getElementById("newCategoryName");
const newCategoryColor = document.getElementById("newCategoryColor");

addCategoryBtn.addEventListener("click", async () => {
  const name = newCategoryName.value.trim();
  const color = newCategoryColor.value;

  if (!name) {
    alert("Veuillez entrer un nom de catégorie.");
    return;
  }

  await createCategory(name, color);

  newCategoryName.value = "";
  newCategoryColor.value = "#888888";

  afficherCategories();
});

// --- Gestion modale événements ---
const eventModal = document.getElementById("eventModal");
const closeEventModal = document.getElementById("closeEventModal");
const eventEditForm = document.getElementById("eventEditForm");

closeEventModal.addEventListener("click", () => {
  eventModal.classList.add("hidden");
});

window.addEventListener("click", (e) => {
  if (e.target === eventModal) {
    eventModal.classList.add("hidden");
  }
});

eventEditForm.onsubmit = async (e) => {
  e.preventDefault();
  const id = parseInt(document.getElementById("eventId").value, 10);
  const title = document.getElementById("eventEditTitle").value.trim();
  const date = document.getElementById("eventEditDate").value;
  const time = document.getElementById("eventEditTime").value || "";

  await updateEvent({ id, title, date, time });
  eventModal.classList.add("hidden");
};

// Rendre les listes Eisenhower collapsables par rangée (haut = 2, bas = 2)
function initCollapsibleEisenhower() {
  const urgentTop = document.getElementById("urgent-list");
  const importantTop = document.getElementById("important-list");
  const urgentBottom = document.getElementById("urgent-notimportant-list");
  const notUrgentBottom = document.getElementById("noturgent-notimportant-list");

  // Petite fonction utilitaire pour lier un header à un groupe de sections
  const bindRowToggle = (section, groupSections) => {
    const header = section.querySelector("h2");
    if (!header) return;

    header.addEventListener("click", () => {
      // Si la première section du groupe n'est pas encore collapsed,
      // on collapse tout le groupe, sinon on les ouvre toutes.
      const shouldCollapse = !groupSections[0].classList.contains("collapsed");
      groupSections.forEach(sec => {
        sec.classList.toggle("collapsed", shouldCollapse);
      });
    });
  };

  // 💡 Rangée du haut : 🔥 & ⭐ ensemble
  bindRowToggle(urgentTop, [urgentTop, importantTop]);
  bindRowToggle(importantTop, [urgentTop, importantTop]);

  // 💡 Rangée du bas : ⚡ & 💤 ensemble
  bindRowToggle(urgentBottom, [urgentBottom, notUrgentBottom]);
  bindRowToggle(notUrgentBottom, [urgentBottom, notUrgentBottom]);
}
