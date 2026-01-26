import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

type Ingredient = { name: string; amount: string; unit?: string };

type FormValues = {
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
};

export function AddRecipeForm({
  onSubmit,
  submitLabel = "Add Recipe",
  defaultValues,
}: {
  onSubmit: (values: FormValues) => void | Promise<void>;
  submitLabel?: string;
  defaultValues?: Partial<FormValues>;
}) {
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    defaultValues?.ingredients?.length
      ? defaultValues.ingredients
      : [{ name: "", amount: "", unit: "" }]
  );
  const [steps, setSteps] = useState<string[]>(
    defaultValues?.steps?.length ? defaultValues.steps : [""]
  );

  useEffect(() => {
    if (!defaultValues) return;

    if (typeof defaultValues.title === "string") setTitle(defaultValues.title);
    if (typeof defaultValues.description === "string") setDescription(defaultValues.description);

    if (defaultValues.ingredients && defaultValues.ingredients.length) {
      setIngredients(
        defaultValues.ingredients.map((i) => ({
          name: i.name ?? "",
          amount: i.amount ?? "",
          unit: i.unit ?? "",
        }))
      );
    } else {
      setIngredients([{ name: "", amount: "", unit: "" }]);
    }

    if (defaultValues.steps && defaultValues.steps.length) {
      setSteps(defaultValues.steps.map((s) => s ?? ""));
    } else {
      setSteps([""]);
    }
  }, [defaultValues]);

  const addIngredient = () =>
    setIngredients((prev) => [...prev, { name: "", amount: "", unit: "" }]);

  const updateIngredient = (idx: number, patch: Partial<Ingredient>) =>
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, ...patch } : ing)));

  const removeIngredient = (idx: number) =>
    setIngredients((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [{ name: "", amount: "", unit: "" }];
    });

  const addStep = () => setSteps((prev) => [...prev, ""]);

  const updateStep = (idx: number, value: string) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));

  const removeStep = (idx: number) =>
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [""];
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedIngredients = ingredients
      .map((i) => ({
        name: (i.name ?? "").trim(),
        amount: (i.amount ?? "").trim(),
        unit: (i.unit ?? "").trim(),
      }))
      .filter((i) => i.name || i.amount || i.unit);

    const cleanedSteps = steps.map((s) => s.trim()).filter(Boolean);

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      ingredients: cleanedIngredients,
      steps: cleanedSteps,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="p-6">
        <h2 className="font-serif text-2xl font-semibold mb-4">Basic Information</h2>

        <div className="space-y-2">
          <Label htmlFor="title">Recipe Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[96px] rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl font-semibold">Ingredients</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={addIngredient}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Ingredient
          </Button>
        </div>

        <div className="space-y-3">
          {ingredients.map((ing, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_44px] gap-3">
              <Input
                placeholder="Name"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, { name: e.target.value })}
              />
              <Input
                placeholder="Amount"
                value={ing.amount}
                onChange={(e) => updateIngredient(idx, { amount: e.target.value })}
              />
              <Input
                placeholder="Unit"
                value={ing.unit ?? ""}
                onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeIngredient(idx)}
                className="h-10 w-10 p-0"
                aria-label="Remove ingredient"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl font-semibold">Cooking Steps</h2>
          <Button type="button" variant="secondary" onClick={addStep} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Step
          </Button>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="grid grid-cols-[36px_1fr_44px] gap-3 items-start">
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-sm">
                {idx + 1}
              </div>

              <textarea
                value={step}
                onChange={(e) => updateStep(idx, e.target.value)}
                className="w-full min-h-[72px] rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              />

              <Button
                type="button"
                variant="secondary"
                onClick={() => removeStep(idx)}
                className="h-10 w-10 p-0"
                aria-label="Remove step"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          className="bg-blue-950 text-white border border-blue-950 hover:bg-blue-900 hover:border-blue-900"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
