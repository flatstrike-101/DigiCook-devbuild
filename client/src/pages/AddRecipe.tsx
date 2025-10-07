import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddRecipeForm } from "@/components/AddRecipeForm";
import { InsertRecipe } from "@shared/schema";
import { savePersonalRecipe } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";

export default function AddRecipe() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = (recipe: InsertRecipe) => {
    const saved = savePersonalRecipe(recipe);
    console.log("Recipe saved:", saved);
    
    toast({
      title: "Recipe saved!",
      description: "Your recipe has been added to your collection.",
    });
    
    setLocation("/my-recipes");
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-muted/50 border-b py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/my-recipes")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Recipes
          </Button>
          
          <h1 className="font-serif text-4xl font-bold mb-2">Add New Recipe</h1>
          <p className="text-muted-foreground">
            Create and save your own recipe to your personal collection
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AddRecipeForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
