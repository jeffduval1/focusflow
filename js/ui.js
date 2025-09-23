import { getTasks, deleteTask, updateTask } from "./tasks.js";
import { getEvents, deleteEvent } from "./events.js";

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

  tasks
    .sort((a, b) => b.cote - a.cote)
    .forEach((t) => {
      // Placement selon cote
      if (t.cote >= 8) {
        urgentList.appendChild(buildTaskItem(t, "quad"));
      } else if (t.cote >= 5) {
        importantList.appendChild(buildTaskItem(t, "quad"));
      } else if (t.cote >= 3) {
        urgentNotImportantList.appendChild(buildTaskItem(t, "quad"));
      } else {
        notUrgentNotImportantList.appendChild(buildTaskItem(t, "quad"));
      }

      // Liste principale
      taskList.appendChild(buildTaskItem(t, "main"));

      // Échéances
      if (t.due) {
        const dl = document.createElement("li");
        dl.textContent = `${t.title} → ${t.due}`;
        deadlines.appendChild(dl);
      }
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
