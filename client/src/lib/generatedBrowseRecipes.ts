import { Recipe } from "@shared/schema";

const proteins = [
  "Chicken",
  "Beef",
  "Tofu",
  "Salmon",
  "Turkey",
  "Shrimp",
  "Lentil",
  "Chickpea",
  "Egg",
  "Mushroom",
];

const styles = [
  "Skillet",
  "Bowl",
  "Pasta",
  "Wrap",
  "Soup",
  "Salad",
  "Stir Fry",
  "Bake",
  "Stew",
  "Tacos",
];

const cuisines = [
  "Italian",
  "American",
  "Asian",
  "Mediterranean",
  "Mexican",
];

const difficulties: Array<"Easy" | "Medium" | "Hard"> = ["Easy", "Medium", "Hard"];

function makeRecipe(i: number): Recipe {
  const protein = proteins[i % proteins.length];
  const style = styles[Math.floor(i / proteins.length) % styles.length];
  const cuisine = cuisines[i % cuisines.length];
  const difficulty = difficulties[i % difficulties.length];
  const cookTime = 15 + (i % 6) * 10;
  const servings = 2 + (i % 4);
  const calories = 280 + (i % 8) * 55;

  return {
    id: `generated-browse-${i + 1}`,
    title: `${cuisine} ${protein} ${style}`,
    description: `A ${difficulty.toLowerCase()} ${style.toLowerCase()} with ${protein.toLowerCase()} and fresh pantry ingredients.`,
    imageUrl:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=900&fit=crop&auto=format",
    cookTime,
    servings,
    difficulty,
    cuisine,
    dietary: protein === "Tofu" || protein === "Lentil" || protein === "Chickpea" || protein === "Mushroom"
      ? ["vegetarian"]
      : [],
    ingredients: [
      { name: protein, amount: "1", unit: "lb" },
      { name: "Olive oil", amount: "2", unit: "tbsp" },
      { name: "Garlic", amount: "3", unit: "cloves" },
      { name: "Onion", amount: "1", unit: "medium" },
      { name: "Bell pepper", amount: "1", unit: "whole" },
      { name: "Salt", amount: "1", unit: "tsp" },
      { name: "Black pepper", amount: "1/2", unit: "tsp" },
    ],
    steps: [
      "Prep all ingredients and slice vegetables evenly.",
      `Cook ${protein.toLowerCase()} in a hot pan with oil until lightly browned.`,
      "Add aromatics and vegetables, then season and cook until tender.",
      "Finish with a splash of water or broth and simmer briefly.",
      "Taste, adjust seasoning, and serve warm.",
    ],
    nutrition: {
      calories,
      protein: 18 + (i % 7) * 3,
      carbs: 20 + (i % 6) * 4,
      fat: 10 + (i % 5) * 2,
      fiber: 3 + (i % 4),
      sugar: 4 + (i % 3),
    },
    isPersonal: false,
    createdAt: new Date(2025, 0, 1 + (i % 28)).toISOString(),
  };
}

export const generatedBrowseRecipes: Recipe[] = Array.from({ length: 100 }, (_, i) =>
  makeRecipe(i),
);

