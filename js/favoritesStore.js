import {
  dbReady,
  getAllData,
  deleteData,
  addDataReturnId,
  getFavoriteByHex as dbGetFavoriteByHex,
} from "./db.js";
import { normalizeHex, hexToDisplayName } from "./colorNames.js";

export async function listFavoriteColors() {
  await dbReady;
  const rows = await getAllData("favoriteColors");
  return rows.sort((a, b) => (a.hex || "").localeCompare(b.hex || ""));
}

export async function getFavoriteByHex(hex) {
  await dbReady;
  const n = normalizeHex(hex);
  if (!n) return null;
  return dbGetFavoriteByHex(n);
}

/** Ajoute une couleur favorite ; rejette si déjà présente. Retourne l’id ou null. */
export async function addFavoriteColor(hex) {
  await dbReady;
  const n = normalizeHex(hex);
  if (!n) return null;
  const existing = await dbGetFavoriteByHex(n);
  if (existing) return existing.id;
  const name = hexToDisplayName(n);
  const id = await addDataReturnId("favoriteColors", { hex: n, name });
  return id;
}

export async function deleteFavoriteById(id) {
  await dbReady;
  await deleteData("favoriteColors", id);
}

/** Retire des favoris et place dans l’archive tampon (corbeille couleurs). */
export async function moveFavoriteToArchive(favoriteId) {
  await dbReady;
  const all = await getAllData("favoriteColors");
  const row = all.find((x) => x.id === favoriteId);
  if (!row) return;
  await addDataReturnId("colorArchive", {
    hex: row.hex,
    name: row.name,
    archivedAt: new Date().toISOString(),
  });
  await deleteData("favoriteColors", favoriteId);
}

export async function listArchivedColors() {
  await dbReady;
  const rows = await getAllData("colorArchive");
  return rows.sort((a, b) => (a.archivedAt || "").localeCompare(b.archivedAt || ""));
}

export async function restoreColorFromArchive(archiveId) {
  await dbReady;
  const all = await getAllData("colorArchive");
  const row = all.find((x) => x.id === archiveId);
  if (!row) return;
  const dup = await dbGetFavoriteByHex(row.hex);
  if (!dup) {
    await addDataReturnId("favoriteColors", { hex: row.hex, name: row.name });
  }
  await deleteData("colorArchive", archiveId);
}

export async function permanentDeleteArchivedColor(archiveId) {
  await dbReady;
  await deleteData("colorArchive", archiveId);
}
