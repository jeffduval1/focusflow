import { getTasks, deleteTask, updateTask, addTask } from "./tasks.js";
import { getEvents, deleteEvent, addEvent } from "./events.js";

// 🔧 Fonction utilitaire pour construire un <li> de tâche
function buildTaskItem(t, context = "main") {
  const li = document.createElement("li");
  li.classList.add("task-item");

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
    opt.textContent = i;
    if (i === t.cote) opt.selected = true;
    select.appendChild(opt);
  }
  select.onchange = () => {
    t.cote = parseInt(select.value);
    updateTask(t);
  };

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
  ["", "Travail", "Famille", "Maison", "Loisirs", "Kung-Fu"].forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat === "" ? "— Choisir une catégorie —" : cat;

    switch (cat) {
      case "Travail": opt.style.backgroundColor = "#1C2D49"; opt.style.color = "#fff"; break;
      case "Famille": opt.style.backgroundColor = "#8C3C3C"; opt.style.color = "#fff"; break;
      case "Maison":  opt.style.backgroundColor = "#4B7355"; opt.style.color = "#fff"; break;
      case "Loisirs": opt.style.backgroundColor = "#B58B00"; opt.style.color = "#000"; break;
      case "Kung-Fu": opt.style.backgroundColor = "#8046A0"; opt.style.color = "#fff"; break;
      default: opt.style.backgroundColor = "#ECECEC"; opt.style.color = "#000";
    }

    if (t.category === cat) opt.selected = true;
    catSelect.appendChild(opt);
  });
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
  categoryBadge.textContent = t.category || "Sans catégorie";
  applyCategoryStyle(t.category);
  categoryWrapper.appendChild(categoryBadge);
  categoryWrapper.appendChild(editBtn);
  categoryWrapper.appendChild(catSelect);
// --- Input date caché ---
const dueInput = document.createElement("input");
dueInput.type = "date";
dueInput.classList.add("hidden");
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

// Quand la date change
dueInput.onchange = () => {
  appliquerNouvelleEcheance();
};
dueInput.onblur = () => {
  // Même si la valeur est identique, on considère que l'utilisateur a confirmé
  appliquerNouvelleEcheance();
};

function appliquerNouvelleEcheance() {
  t.due = dueInput.value || null;
  updateTask(t);

  if (t.id) {
    echeancesMasquees.delete(t.id);
  }

  if (t.due) {
    dueBadge.textContent = `⏳ ${t.due}`;
  } else {
    dueBadge.textContent = "+ ⏳";
  }

  dueBadge.style.display = "inline-block";
  dueInput.classList.add("hidden");

  renderTasks();
}



right.appendChild(dueInput);
// Fermer si clic en dehors
document.addEventListener("click", (e) => {
  if (!right.contains(e.target)) {
    if (dueInput && !dueInput.classList.contains("hidden")) {
      // Si aucun changement et aucune date choisie
      if (!dueInput.value) {
        dueBadge.textContent = "+ ⏳";
      } else {
        dueBadge.textContent = `⏳ ${dueInput.value}`;
      }

      dueBadge.style.display = "inline-block";
      dueInput.classList.add("hidden");
    }
  }
});

  // Actions édition catégorie
  editBtn.onclick = (e) => {
    e.stopPropagation();
    categoryBadge.style.display = "none";
    editBtn.style.display = "none";
    catSelect.classList.remove("hidden");
    catSelect.focus();
  };

  catSelect.onchange = () => {
    t.category = catSelect.value || null;
    updateTask(t);
    categoryBadge.textContent = t.category || "Sans catégorie";
    applyCategoryStyle(t.category);
    categoryBadge.style.display = "inline-block";
    editBtn.style.display = "inline-block";
    catSelect.classList.add("hidden");
  };

  document.addEventListener("click", (e) => {
    if (!categoryWrapper.contains(e.target)) {
      categoryBadge.style.display = "inline-block";
      editBtn.style.display = "inline-block";
      catSelect.classList.add("hidden");
    }
  });

  // --- Bouton suppression ---
  const del = document.createElement("button");
  del.classList.add("delete-btn");
  del.textContent = "❌";

  if (context === "main") {
    del.onclick = () => deleteTask(t.id); // vraie suppression
  } else {
    del.onclick = () => li.remove(); // effacement visuel seulement
  }

  // Assembler
  right.appendChild(select);
  right.appendChild(categoryWrapper);
  right.appendChild(del);

  li.appendChild(left);
  li.appendChild(right);

  return li;
}
// Registre des échéances masquées (par id de tâche)
let echeancesMasquees = new Set();

// --- Rendu principal ---
export async function renderTasks() {
  const tasks = await getTasks();
  const urgentList = document.querySelector("#urgent-list ul");
  const importantList = document.querySelector("#important-list ul");
  const urgentNotImportantList = document.querySelector("#urgent-notimportant-list ul");
  const notUrgentNotImportantList = document.querySelector("#noturgent-notimportant-list ul");
  const taskList = document.querySelector("#task-list ul");
  const deadlines = document.querySelector("#deadlines ul");

  urgentList.innerHTML = "";
  importantList.innerHTML = "";
  urgentNotImportantList.innerHTML = "";
  notUrgentNotImportantList.innerHTML = "";
  taskList.innerHTML = "";
  deadlines.innerHTML = "";

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

  // --- Échéances groupées par mois (triées par date croissante)
  const echeances = tasks
    .filter(t => t.due && !echeancesMasquees.has(t.id))
    .map(t => ({ ...t, dueDate: new Date(t.due) }))
    .sort((a, b) => a.dueDate - b.dueDate);

  let currentMonth = "";
  let monthList = null;

  echeances.forEach(t => {
    const mois = t.dueDate.toLocaleString("fr-FR", { month: "long", year: "numeric" });

    if (mois !== currentMonth) {
      currentMonth = mois;

      const header = document.createElement("div");
      header.classList.add("echeance-month");
      header.textContent = mois.charAt(0).toUpperCase() + mois.slice(1);
      deadlines.appendChild(header);

      monthList = document.createElement("ul");
      deadlines.appendChild(monthList);
    }

    const dl = document.createElement("li");
    dl.classList.add("echeance-item");

    const dateSpan = document.createElement("span");
    dateSpan.classList.add("echeance-date");
    dateSpan.textContent = t.due;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(t.due);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      dateSpan.style.color = "#b00";
    } else {
      dateSpan.style.color = "#333";
    }

    const arrow = document.createElement("span");
    arrow.classList.add("echeance-arrow");
    arrow.textContent = "→";

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("echeance-title");
    titleSpan.textContent = t.title;

    const hideBtn = document.createElement("button");
    hideBtn.textContent = "❌";
    hideBtn.classList.add("delete-btn");
    hideBtn.onclick = () => {
      echeancesMasquees.add(t.id);
      renderTasks();
    };

    dl.appendChild(dateSpan);
    dl.appendChild(arrow);
    dl.appendChild(titleSpan);
    dl.appendChild(hideBtn);

    monthList.appendChild(dl);
  });
}


// --- Rendu événements ---
export async function renderEvents() {
  const events = await getEvents();
  const ul = document.querySelector("#events ul");
  ul.innerHTML = "";

  events
    .sort((a, b) => new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time))
    .forEach((e) => {
      const li = document.createElement("li");
      li.textContent = `${e.title} (${e.date} ${e.time || ""})`;

      const del = document.createElement("button");
      del.textContent = "❌";
      del.onclick = () => deleteEvent(e.id);
      li.appendChild(del);

      ul.appendChild(li);
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
// Quand on clique sur Fusionner ou Remplacer tout
document.querySelectorAll(".import-option").forEach(option => {
  option.addEventListener("click", () => {
    const mode = option.dataset.mode; // "fusion" ou "remplacer"
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

async function viderBaseDeDonnees() {
  const tasks = await getTasks();
  for (let t of tasks) {
    await deleteTask(t.id);
  }

  const events = await getEvents();
  for (let e of events) {
    await deleteEvent(e.id);
  }
}
async function trouverTacheParTitre(titre) {
  const tasks = await getTasks();
  return tasks.find(t => t.title === titre) || null;
}

async function trouverEvenementParTitre(titre) {
  const events = await getEvents();
  return events.find(e => e.title === titre) || null;
}

// 🔧 importer JSON avec fusion/remplacement
export async function importerJSON(contenu, mode = "fusion") {
  try {
    const data = JSON.parse(contenu);

    if (mode === "remplacer") {
      await viderBaseDeDonnees();
    }

    if (Array.isArray(data.tasks)) {
      for (const t of data.tasks) {
        if (mode === "fusion") {
          const existante = await trouverTacheParTitre(t.title);
          if (existante) continue;
        }
        await addTask(t);
      }
    }

    if (Array.isArray(data.events)) {
      for (const ev of data.events) {
        if (mode === "fusion") {
          const existant = await trouverEvenementParTitre(ev.title);
          if (existant) continue;
        }
        await addEvent(ev);
      }
    }

    await renderTasks();
    await renderEvents();

    alert(`✅ Import terminé (${mode === "fusion" ? "fusion sans doublons" : "remplacement total"})`);

  } catch (err) {
    console.error("Erreur import:", err);
    alert("❌ Fichier invalide ou erreur d’import.");
  }
}