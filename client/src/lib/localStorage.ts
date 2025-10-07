import { Recipe, InsertRecipe } from "@shared/schema";

// Key for storing personal recipes in localStorage
const PERSONAL_RECIPES_KEY = "digiCook_personalRecipes";

// Get all personal recipes from localStorage
export function getPersonalRecipes(): Recipe[] {
  try {
    const stored = localStorage.getItem(PERSONAL_RECIPES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error reading personal recipes:", error);
    return [];
  }
}

// Save a new personal recipe to localStorage
export function savePersonalRecipe(recipe: InsertRecipe): Recipe {
  const recipes = getPersonalRecipes();
  const newRecipe: Recipe = {
    ...recipe,
    imageUrl: recipe.imageUrl || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=600&fit=crop",
    id: `personal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    isPersonal: true,
    createdAt: new Date().toISOString(),
  };
  
  recipes.push(newRecipe);
  localStorage.setItem(PERSONAL_RECIPES_KEY, JSON.stringify(recipes));
  return newRecipe;
}

// Delete a personal recipe from localStorage
export function deletePersonalRecipe(id: string): void {
  const recipes = getPersonalRecipes();
  const filtered = recipes.filter(r => r.id !== id);
  localStorage.setItem(PERSONAL_RECIPES_KEY, JSON.stringify(filtered));
}

// Get a single recipe by ID (checks both personal and starter recipes)
export function getRecipeById(id: string, starterRecipes: Recipe[]): Recipe | undefined {
  // Check personal recipes first
  const personalRecipes = getPersonalRecipes();
  const personal = personalRecipes.find(r => r.id === id);
  if (personal) return personal;
  
  // Check starter recipes
  return starterRecipes.find(r => r.id === id);
}
