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

  return (
    <div className="min-h-screen">
      <div className="bg-muted/50 border-b py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">My Recipes</h1>
              <p className="text-muted-foreground">
                Your personal collection of recipes
              </p>
            </div>
            
            <Button onClick={() => setLocation("/add-recipe")} data-testid="button-add-recipe">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Recipe
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {recipes.length === 0 ? (
          <div className="text-center py-16" data-testid="text-empty-state">
            <h3 className="text-2xl font-semibold mb-2">No recipes yet</h3>
            <p className="text-muted-foreground mb-6">
              Start creating your own recipes to see them here
            </p>
            <Button onClick={() => setLocation("/add-recipe")} data-testid="button-create-first">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Recipe
            </Button>
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
