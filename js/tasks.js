import { addData, getAllData, updateData, deleteData } from "./db.js";
import { renderTasks } from "./ui.js";

export async function addTask(task) {
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

export async function getTasks() {
  return await getAllData("tasks");
}
