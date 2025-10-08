import { Recipe } from "@shared/schema";
import { RecipeCard } from "./RecipeCard";

interface RecipeGridProps {
  recipes: Recipe[];
  emptyMessage?: string;
}

export function RecipeGrid({ recipes, emptyMessage = "No recipes found." }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-16" data-testid="text-no-recipes">
        <p className="text-white text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
