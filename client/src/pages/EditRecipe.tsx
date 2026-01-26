import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddRecipeForm } from "@/components/AddRecipeForm";
import { InsertRecipe } from "@shared/schema";
import { db, auth } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function EditRecipe() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/edit-recipe/:id");
  const recipeId = params?.id;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<InsertRecipe | null>(null);
  const [recipeTitle, setRecipeTitle] = useState("");

  useEffect(() => {
    if (!recipeId) return;

    const loadRecipe = async () => {
      try {
        const snap = await getDoc(doc(db, "recipes", recipeId));
        if (!snap.exists()) {
          toast({ title: "Recipe not found", variant: "destructive" });
          setLocation("/my-recipes");
          return;
        }

        const data = snap.data() as any;

        setInitialData({
          title: data.title ?? "",
          description: data.description ?? "",
          ingredients: data.ingredients ?? [],
          steps: data.steps ?? [],
        });

        setRecipeTitle(data.title ?? "");
        setLoading(false);
      } catch {
        toast({ title: "Error loading recipe", variant: "destructive" });
        setLocation("/my-recipes");
      }
    };

    loadRecipe();
  }, [recipeId]);

  const handleSubmit = async (recipe: InsertRecipe) => {
    const user = auth.currentUser;
    if (!user || !recipeId) return;

    try {
      await updateDoc(doc(db, "recipes", recipeId), {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      });

      toast({ title: "Recipe updated", description: "Your changes have been saved." });
      setLocation("/my-recipes");
    } catch {
      toast({ title: "Error saving recipe", variant: "destructive" });
    }
  };

  if (loading || !initialData) return null;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-muted/50 border-b py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => setLocation("/my-recipes")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Recipes
          </Button>

          <h1 className="font-serif text-4xl font-bold mb-2">Edit {recipeTitle}</h1>
          <p className="text-muted-foreground">Update recipe information</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AddRecipeForm
          defaultValues={initialData}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
