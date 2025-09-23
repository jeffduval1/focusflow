import { addData, getAllData, updateData, deleteData } from "./db.js";
import { renderEvents } from "./ui.js";

export async function addEvent(event) {
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
