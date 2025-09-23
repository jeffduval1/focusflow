import { dbReady } from "./db.js";
import { addTask } from "./tasks.js";
import { addEvent } from "./events.js";
import { renderTasks, renderEvents } from "./ui.js";

// Attendre que DB soit prête
await dbReady;
renderTasks();
renderEvents();


// Ajouter tâche
document.querySelector("#taskForm").onsubmit = async (e) => {
  e.preventDefault();
  const title = document.querySelector("#taskTitle").value;
  const cote = parseInt(document.querySelector("#taskCote").value);
  const due = document.querySelector("#taskDue").value || null;
  const category = document.querySelector("#taskCategory").value || null;

  await addTask({ title, cote, due, category });
  e.target.reset();
  taskModal.classList.add("hidden"); 
};
const categorySelect = document.querySelector("#taskCategory");
const categoryWrapper = document.querySelector("#categoryWrapper");

categorySelect.onchange = () => {
  const selected = categorySelect.value;
  if (!selected) return;

  // Création du badge
  const badge = document.createElement("span");
  badge.classList.add("task-category");
  badge.textContent = selected;

  // Appliquer la couleur
  switch (selected) {
    case "Travail": badge.style.backgroundColor = "#1C2D49"; badge.style.color = "#fff"; break;
    case "Famille": badge.style.backgroundColor = "#8C3C3C"; badge.style.color = "#fff"; break;
    case "Maison": badge.style.backgroundColor = "#4B7355"; badge.style.color = "#fff"; break;
    case "Loisirs": badge.style.backgroundColor = "#B58B00"; badge.style.color = "#000"; break;
    case "Kung-Fu": badge.style.backgroundColor = "#8046A0"; badge.style.color = "#fff"; break;
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

document.querySelector("#importBtn").onclick = () => {
  document.querySelector("#importFile").click();
};

document.querySelector("#importFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const { tasks, events } = JSON.parse(text);
  for (let t of tasks) await addTask(t);
  for (let ev of events) await addEvent(ev);
};
// Gestion de la modale de tâche
const taskModal = document.getElementById("taskModal");
const openTaskModal = document.getElementById("openTaskModal");
const closeTaskModal = document.getElementById("closeTaskModal");

openTaskModal.addEventListener("click", () => {
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
