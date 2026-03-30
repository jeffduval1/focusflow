import { addData, getAllData, updateData, deleteData } from "./db.js";
import { renderEvents } from "./ui.js?v=20260330";
import { getCurrentWorkspaceId } from "./workspaces.js";  // 🔹 ajout

async function refreshUIAfterEventsChange() {
  await renderEvents();
  const { renderTasks } = await import("./ui.js?v=20260330");
  await renderTasks();
}

export async function addEvent(event) {

  // 🔥 NOUVEAU : assigner automatiquement le workspace courant
  if (!event.workspaceId) {
    const wsId = await getCurrentWorkspaceId();
    event.workspaceId = wsId;
  }

  await addData("events", event);
  await refreshUIAfterEventsChange();
}

export async function updateEvent(event) {
  await updateData("events", event);
  await refreshUIAfterEventsChange();
}

export async function deleteEvent(id) {
  await deleteData("events", id);
  await refreshUIAfterEventsChange();
}

export async function getEvents() {
  const wsId = await getCurrentWorkspaceId();
  const all = await getAllData("events");
  return all.filter((e) => e.workspaceId === wsId);
}
