import { RecipeCard } from "../RecipeCard";
import { Router } from "wouter";

const mockRecipe = {
  id: "1",
  title: "Spaghetti Carbonara",
  description: "Classic Italian pasta with eggs, cheese, and pancetta",
  imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&h=600&fit=crop",
  cookTime: 25,
  servings: 4,
  difficulty: "Medium" as const,
  cuisine: "Italian",
  dietary: ["vegetarian"],
  ingredients: [],
  steps: [],
  nutrition: { calories: 520, protein: 28, carbs: 62, fat: 18 },
  isPersonal: false,
};

export default function RecipeCardExample() {
  return (
    <Router>
      <div className="p-6 max-w-sm">
        <RecipeCard recipe={mockRecipe} />
      </div>
    </Router>
  );
}
