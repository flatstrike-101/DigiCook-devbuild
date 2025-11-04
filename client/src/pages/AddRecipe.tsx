import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddRecipeForm } from "@/components/AddRecipeForm";
import { InsertRecipe } from "@shared/schema";
import { db, auth } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function AddRecipe() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (recipe: InsertRecipe) => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to save your recipe.",
        variant: "destructive",
      });
      return;
    }

    try {
      // ✅ Save recipe directly to Firestore
      const docRef = await addDoc(collection(db, "recipes"), {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      console.log("✅ Recipe added with ID:", docRef.id);

      // ✅ Success toast
      toast({
        title: "Recipe saved!",
        description: "Your recipe has been added to your collection.",
      });

      // ✅ Redirect to My Recipes
      setLocation("/my-recipes");
    } catch (error) {
      console.error("❌ Firestore error:", error);
      toast({
        title: "Error",
        description: "Failed to save recipe. Please try again.",
        variant: "destructive",
      });
    }
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

      {/* ✅ Firestore saving is handled here only */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AddRecipeForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
