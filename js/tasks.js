import { addData, getAllData, updateData, deleteData } from "./db.js";
import { renderTasks } from "./ui.js";
import { getCurrentWorkspaceId } from "./workspaces.js";

export async function addTask(task) {
  // Assigner un workspaceId si ce n'est pas déjà fait
  if (!task.workspaceId) {
    const wsId = await getCurrentWorkspaceId();
    task.workspaceId = wsId;
  }

  await addData("tasks", task);
  await renderTasks();
}

export async function updateTask(task) {
  await updateData("tasks", task);
  await renderTasks();
}

export async function deleteTask(id) {
  await deleteData("tasks", id);
  await renderTasks();
}


// Renvoie seulement les tâches du workspace courant
export async function getTasks() {
  const wsId = await getCurrentWorkspaceId();
  const all = await getAllData("tasks");
  return all.filter(t => t.workspaceId === wsId);
}
