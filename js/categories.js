import { getCurrentWorkspaceId } from "./workspaces.js";
import {
    getCategories as dbGetCategories,
    addCategory as dbAddCategory,
    updateCategory as dbUpdateCategory,
    deleteCategory as dbDeleteCategory
  } from "./db.js";
import { normalizeHex } from "./colorNames.js";
  
  // 🔹 Catégories par défaut (uniquement utilisées si la DB est vide au démarrage)
  const defaultCategories = [
    { id: "cat-travail", name: "Travail", color: "#336699" },
    { id: "cat-famille", name: "Famille", color: "#993333" },
    { id: "cat-maison", name: "Maison", color: "#669933" },
    { id: "cat-loisirs", name: "Loisirs", color: "#996699" },
    { id: "cat-kungfu", name: "Kung-Fu", color: "#cc9933" },
  ];
  
 // 🔹 Récupérer toutes les catégories
export async function fetchCategories() {
    const cats = await dbGetCategories();
    if (cats.length === 0) {
      for (const c of defaultCategories) {
        await dbAddCategory(c);
      }
      return defaultCategories;
    }
    return cats;
  }
  
  // 🔹 Ajouter une catégorie — retourne l’id créé
  export async function createCategory(name, color) {
    const id = "cat-" + Date.now();
    const hex = normalizeHex(color) || "#888888";
    await dbAddCategory({ id, name, color: hex });
    return id;
  }
  
  // 🔹 Modifier une catégorie
  export async function editCategory(cat) {
    await dbUpdateCategory(cat);
  }
  
  // 🔹 Supprimer une catégorie
  export async function removeCategory(id) {
    await dbDeleteCategory(id);
  }