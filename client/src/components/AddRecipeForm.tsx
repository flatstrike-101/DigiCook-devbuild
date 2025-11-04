import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRecipeSchema, InsertRecipe } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AddRecipeFormProps {
  onSubmit: (recipe: InsertRecipe) => void;
}

export function AddRecipeForm({ onSubmit }: AddRecipeFormProps) {
  const [ingredients, setIngredients] = useState<
    Array<{ name: string; amount: string; unit?: string }>
  >([{ name: "", amount: "", unit: "" }]);
  const [steps, setSteps] = useState<string[]>([""]);

  const form = useForm<InsertRecipe>({
  //  resolver: zodResolver(insertRecipeSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      cuisine: "",
      dietary: [],
      ingredients: [{ name: "", amount: "", unit: "" }],
      steps: [""],
    },
  });

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", unit: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setSteps([...steps, ""]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: InsertRecipe) => {
    const recipeData: InsertRecipe = {
      ...data,
      ingredients,
      steps,
    };
    onSubmit(recipeData);
  };

  const blueButtonClasses =
    "bg-blue-950 text-white border-blue-950 hover:bg-blue-900 hover:border-blue-900";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Basic Info */}
        <Card className="p-6">
          <h3 className="font-serif text-2xl font-semibold mb-6">
            Basic Information
          </h3>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder=""
                      {...field}
                      data-testid="input-recipe-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder=""
                      {...field}
                      data-testid="input-recipe-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Ingredients */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-2xl font-semibold">Ingredients</h3>
            <Button
              type="button"
              onClick={addIngredient}
              variant="outline"
              size="sm"
              data-testid="button-add-ingredient"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Button>
          </div>

          <div className="space-y-3">
            {ingredients.map((_, index) => (
              <div key={index} className="flex gap-3">
                <Input
                  placeholder="Name"
                  value={ingredients[index].name}
                  onChange={(e) => {
                    const newIngredients = [...ingredients];
                    newIngredients[index].name = e.target.value;
                    setIngredients(newIngredients);
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="Amount"
                  value={ingredients[index].amount}
                  onChange={(e) => {
                    const newIngredients = [...ingredients];
                    newIngredients[index].amount = e.target.value;
                    setIngredients(newIngredients);
                  }}
                  className="w-32"
                />
                <Input
                  placeholder="Unit"
                  value={ingredients[index].unit || ""}
                  onChange={(e) => {
                    const newIngredients = [...ingredients];
                    newIngredients[index].unit = e.target.value;
                    setIngredients(newIngredients);
                  }}
                  className="w-24"
                />
                {ingredients.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Steps */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-2xl font-semibold">Cooking Steps</h3>
            <Button
              type="button"
              onClick={addStep}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>

          <div className="space-y-3">
            {steps.map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-10 rounded-md bg-muted text-sm font-medium">
                  {index + 1}
                </div>
                <Textarea
                  placeholder=""
                  value={steps[index]}
                  onChange={(e) => {
                    const newSteps = [...steps];
                    newSteps[index] = e.target.value;
                    setSteps(newSteps);
                  }}
                  className="flex-1"
                  rows={2}
                />
                {steps.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" className={blueButtonClasses}>
            Add Recipe
          </Button>
        </div>
      </form>
    </Form>
  );
}
