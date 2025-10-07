import { useRoute, useLocation } from "wouter";
import { Clock, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShareDialog } from "@/components/ShareDialog";
import { starterRecipes } from "@/lib/starterRecipes";
import { getRecipeById, deletePersonalRecipe } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";

export default function RecipeDetail() {
  const [, params] = useRoute("/recipe/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const recipe = params?.id ? getRecipeById(params.id, starterRecipes) : null;

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Recipe not found</h2>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Go back home
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (!recipe.isPersonal) return;
    
    deletePersonalRecipe(recipe.id);
    toast({
      title: "Recipe deleted",
      description: "Your recipe has been removed.",
    });
    setLocation("/my-recipes");
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-muted/50 border-b py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4" data-testid="text-recipe-title">
            {recipe.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2" data-testid="text-cook-time">
              <Clock className="h-5 w-5" />
              <span>{recipe.cookTime} minutes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-8">
          <ShareDialog recipeId={recipe.id} recipeTitle={recipe.title} />
          {recipe.isPersonal && (
            <Button variant="destructive" onClick={handleDelete} data-testid="button-delete-recipe">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6">
              <h2 className="font-serif text-2xl font-bold mb-4">Description</h2>
              <p className="text-muted-foreground leading-relaxed">{recipe.description}</p>
            </Card>

            <Card className="p-6">
              <h2 className="font-serif text-2xl font-bold mb-6">Ingredients</h2>
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-3" data-testid={`text-ingredient-${index}`}>
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <span>
                      <strong>{ingredient.amount} {ingredient.unit}</strong> {ingredient.name}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="font-serif text-2xl font-bold mb-6">Cooking Steps</h2>
              <ol className="space-y-6">
                {recipe.steps.map((step, index) => (
                  <li key={index} className="flex gap-4" data-testid={`text-step-${index}`}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <p className="pt-1 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div>
            <Card className="p-6 sticky top-20">
              <h2 className="font-serif text-2xl font-bold mb-6">Nutrition Facts</h2>
              <p className="text-sm text-muted-foreground mb-4">Per serving</p>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="font-medium">Calories</span>
                  <span className="text-lg font-bold" data-testid="text-calories">{recipe.nutrition.calories}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="font-medium">Protein</span>
                  <span data-testid="text-protein">{recipe.nutrition.protein}g</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="font-medium">Carbohydrates</span>
                  <span data-testid="text-carbs">{recipe.nutrition.carbs}g</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="font-medium">Fat</span>
                  <span data-testid="text-fat">{recipe.nutrition.fat}g</span>
                </div>
                {recipe.nutrition.fiber && (
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="font-medium">Fiber</span>
                    <span>{recipe.nutrition.fiber}g</span>
                  </div>
                )}
                {recipe.nutrition.sugar && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Sugar</span>
                    <span>{recipe.nutrition.sugar}g</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
