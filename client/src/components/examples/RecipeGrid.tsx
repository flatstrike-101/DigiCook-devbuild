import { RecipeGrid } from "../RecipeGrid";
import { Router } from "wouter";

const mockRecipes = [
  {
    id: "1",
    title: "Spaghetti Carbonara",
    description: "Classic Italian pasta",
    imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&h=600&fit=crop",
    cookTime: 25,
    servings: 4,
    difficulty: "Medium" as const,
    ingredients: [],
    steps: [],
    nutrition: { calories: 520, protein: 28, carbs: 62, fat: 18 },
    isPersonal: false,
  },
  {
    id: "2",
    title: "Grilled Chicken",
    description: "Healthy grilled chicken",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
    cookTime: 20,
    servings: 2,
    difficulty: "Easy" as const,
    ingredients: [],
    steps: [],
    nutrition: { calories: 320, protein: 38, carbs: 12, fat: 14 },
    isPersonal: false,
  },
];

export default function RecipeGridExample() {
  return (
    <Router>
      <div className="p-6">
        <RecipeGrid recipes={mockRecipes} />
      </div>
    </Router>
  );
}
