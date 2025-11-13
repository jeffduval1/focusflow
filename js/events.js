import { addData, getAllData, updateData, deleteData } from "./db.js";
import { renderEvents } from "./ui.js";
import { getCurrentWorkspaceId } from "./workspaces.js";  // 🔹 ajout

export async function addEvent(event) {

  // 🔥 NOUVEAU : assigner automatiquement le workspace courant
  if (!event.workspaceId) {
    const wsId = await getCurrentWorkspaceId();
    event.workspaceId = wsId;
  }

  await addData("events", event);
  await renderEvents();
}

export async function updateEvent(event) {
  await updateData("events", event);
  await renderEvents();
}

export async function deleteEvent(id) {
  await deleteData("events", id);
  await renderEvents();
}

export async function getEvents() {
  return await getAllData("events");
}
