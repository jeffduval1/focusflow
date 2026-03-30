import { normalizeHex } from "./colorNames.js";
import {
  getFavoriteByHex,
  addFavoriteColor,
  deleteFavoriteById,
} from "./favoritesStore.js";

/** Hex ajoutés via le cœur pendant cette session : peuvent être retirés par le cœur. */
const heartToggleableHex = new Set();

function syncColorInputs(hexIn, colorIn, hex) {
  const n = normalizeHex(hex);
  if (!n) return;
  hexIn.value = n;
  colorIn.value = n;
}

/**
 * @param {string} initialHex
 * @param {{ onOpenPalette?: (applyHex: (hex: string) => void) => void }} [callbacks]
 */
export function createColorControlRow(initialHex = "#888888", callbacks = {}) {
  const wrap = document.createElement("div");
  wrap.className = "color-control-row";

  const hexIn = document.createElement("input");
  hexIn.type = "text";
  hexIn.className = "color-hex-input";
  hexIn.setAttribute("spellcheck", "false");
  hexIn.autocomplete = "off";

  const colorIn = document.createElement("input");
  colorIn.type = "color";
  colorIn.className = "color-native-input";

  const heart = document.createElement("button");
  heart.type = "button";
  heart.className = "btn-fav-heart";
  heart.setAttribute("aria-label", "Couleur favorite");
  heart.textContent = "♡";

  const paletteBtn = document.createElement("button");
  paletteBtn.type = "button";
  paletteBtn.className = "btn-open-favorites";
  paletteBtn.textContent = "Favoris";
  paletteBtn.title = "Choisir dans la palette favorite";

  const start = normalizeHex(initialHex) || "#888888";
  syncColorInputs(hexIn, colorIn, start);

  hexIn.addEventListener("input", () => {
    const n = normalizeHex(hexIn.value);
    if (n) colorIn.value = n;
    void updateHeart();
  });

  colorIn.addEventListener("input", () => {
    hexIn.value = colorIn.value;
    void updateHeart();
  });

  async function updateHeart() {
    const n = normalizeHex(hexIn.value);
    if (!n) {
      heart.textContent = "♡";
      heart.classList.remove("heart-filled", "heart-locked");
      heart.title = "Couleur invalide";
      return;
    }
    const row = await getFavoriteByHex(n);
    const canToggleOff = heartToggleableHex.has(n);
    if (row) {
      heart.textContent = "♥";
      heart.classList.add("heart-filled");
      heart.classList.toggle("heart-locked", !canToggleOff);
      heart.title = canToggleOff
        ? "Retirer des favoris"
        : "Retirer depuis la modale Favoris ou la corbeille";
    } else {
      heart.textContent = "♡";
      heart.classList.remove("heart-filled", "heart-locked");
      heart.title = "Ajouter aux couleurs favorites";
    }
  }

  heart.addEventListener("click", async () => {
    const n = normalizeHex(hexIn.value);
    if (!n) return;
    const row = await getFavoriteByHex(n);
    if (row && !heartToggleableHex.has(n)) return;
    if (row && heartToggleableHex.has(n)) {
      await deleteFavoriteById(row.id);
      heartToggleableHex.delete(n);
    } else {
      await addFavoriteColor(n);
      heartToggleableHex.add(n);
    }
    await updateHeart();
  });

  paletteBtn.addEventListener("click", () => {
    callbacks.onOpenPalette?.((hex) => {
      syncColorInputs(hexIn, colorIn, hex);
      void updateHeart();
    });
  });

  wrap.appendChild(hexIn);
  wrap.appendChild(colorIn);
  wrap.appendChild(heart);
  wrap.appendChild(paletteBtn);

  void updateHeart();

  return {
    wrap,
    getHex: () => normalizeHex(hexIn.value),
    setHex: (h) => {
      const n = normalizeHex(h);
      if (n) syncColorInputs(hexIn, colorIn, n);
      void updateHeart();
    },
    refreshHeart: () => updateHeart(),
  };
}

export function markHexAsSessionFavorite(hex) {
  const n = normalizeHex(hex);
  if (n) heartToggleableHex.add(n);
}
