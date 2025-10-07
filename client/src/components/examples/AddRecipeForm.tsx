import { AddRecipeForm } from "../AddRecipeForm";
import { InsertRecipe } from "@shared/schema";

export default function AddRecipeFormExample() {
  const handleSubmit = (recipe: InsertRecipe) => {
    console.log("Recipe submitted:", recipe);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AddRecipeForm onSubmit={handleSubmit} />
    </div>
  );
}
