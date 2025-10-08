import { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeGrid } from "@/components/RecipeGrid";
import { getPersonalRecipes } from "@/lib/localStorage";
import { Recipe } from "@shared/schema";
import { useLocation } from "wouter";

export default function MyRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setRecipes(getPersonalRecipes());
  }, []);

  // common button classes for dark blue style
  const blueButtonClasses =
    "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900 flex items-center gap-2 px-4 py-2 rounded-md";

  return (
    <div className="min-h-screen">
      <div className="bg-muted/50 border-b py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">My Recipes</h1>
              <p className="text-muted-foreground">
              </p>
            </div>

            <Button
              onClick={() => setLocation("/add-recipe")}
              data-testid="button-add-recipe"
              className={blueButtonClasses}
            >
              <PlusCircle className="h-4 w-4" />
              Add New Recipe
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <p className="text-white text-lg">No recipes found</p>
            {/* Removed the "Add a Recipe" button */}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl font-bold">Your Recipes</h2>
              <p className="text-muted-foreground" data-testid="text-recipe-count">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
              </p>
            </div>
            <RecipeGrid recipes={recipes} />
          </>
        )}
      </div>
    </div>
  );
}

