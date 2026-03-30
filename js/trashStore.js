import { dbReady, getAllData, addDataReturnId, deleteData, updateData } from "./db.js";

export async function moveTaskToTrash(task) {
  await dbReady;
  await addDataReturnId("trashedTasks", {
    taskSnapshot: { ...task },
    deletedAt: new Date().toISOString(),
  });
}

export async function listTrashedTasks() {
  await dbReady;
  const rows = await getAllData("trashedTasks");
  return rows.sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
}

export async function restoreTaskFromTrash(trashRowId) {
  await dbReady;
  const rows = await getAllData("trashedTasks");
  const row = rows.find((r) => r.id === trashRowId);
  if (!row?.taskSnapshot) return;
  await updateData("tasks", row.taskSnapshot);
  await deleteData("trashedTasks", trashRowId);
}

export async function permanentDeleteTrashedTask(trashRowId) {
  await dbReady;
  await deleteData("trashedTasks", trashRowId);
}

export async function clearAllTrashedTasks() {
  await dbReady;
  const rows = await getAllData("trashedTasks");
  for (const r of rows) {
    await deleteData("trashedTasks", r.id);
  }
}
