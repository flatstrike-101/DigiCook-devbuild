import { useState, useEffect } from "react";
import { PlusCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: string; unit?: string }>;
  steps: string[];
  createdAt?: any;
}

export default function MyRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecipes = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(collection(db, "recipes"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Recipe[];

        setRecipes(data);
      } catch (err) {
        console.error("Error loading recipes:", err);
      }
    };

    fetchRecipes();
  }, []);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteDoc(doc(db, "recipes", selected.id));
      setRecipes((prev) => prev.filter((r) => r.id !== selected.id));
      setConfirmDelete(false);
      setSelected(null);

      toast({
        title: "Recipe deleted",
        description: "Your recipe has been successfully removed.",
      });
    } catch (err) {
      console.error("Error deleting recipe:", err);
      toast({
        title: "Error deleting recipe",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openShareModal = () => {
    setShareEmail("");
    setShowShareModal(true);
  };

  const handleShareConfirm = async () => {
    if (!selected) return;

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Not signed in",
        description: "You must be signed in to share a recipe.",
        variant: "destructive",
      });
      return;
    }

    const trimmed = shareEmail.trim();
    if (!trimmed) {
      toast({
        title: "Email required",
        description: "Please enter an email to share this recipe with.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addDoc(collection(db, "recipeShares"), {
        recipeId: selected.id,
        recipeTitle: selected.title,
        fromEmail: user.email ?? "",
        toEmail: trimmed,
        createdAt: serverTimestamp(),
      });

      setShowShareModal(false);
      toast({
        title: "Recipe shared",
        description: `Share request sent to ${trimmed}.`,
      });
    } catch (err) {
      console.error("Error sharing recipe:", err);
      toast({
        title: "Error sharing recipe",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const blueButtonClasses =
    "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900 flex items-center gap-2 px-4 py-2 rounded-md";

  return (
    <div className="min-h-screen">
      <div className="bg-muted/50 border-b py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">My Recipes</h1>
              <p className="text-muted-foreground">View and manage your saved recipes</p>
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
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl font-bold">Your Recipes</h2>
              <p className="text-muted-foreground" data-testid="text-recipe-count">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  onClick={() => setSelected(recipe)}
                  className="cursor-pointer p-6 hover:shadow-lg transition-shadow border border-border"
                >
                  <h2 className="font-serif text-2xl font-semibold mb-2">
                    {recipe.title}
                  </h2>
                  <p className="text-muted-foreground line-clamp-3">
                    {recipe.description}
                  </p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-border rounded-xl shadow-xl p-8 w-full max-w-2xl text-left relative"
            >
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-3xl font-serif font-semibold mb-4">
                {selected.title}
              </h2>
              <p className="mb-6 text-muted-foreground">{selected.description}</p>

              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-lg">Ingredients</h3>
                <ul className="list-disc list-inside space-y-1">
                  {selected.ingredients.map((ing, i) => (
                    <li key={i}>
                      {ing.amount} {ing.unit} {ing.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-lg">Steps</h3>
                <ol className="list-decimal list-inside space-y-1">
                  {selected.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="mt-8 flex justify-between">
                <Button
                  onClick={() => setConfirmDelete(true)}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Recipe
                </Button>

                <Button onClick={openShareModal} className={blueButtonClasses}>
                  Share Recipe
                </Button>
              </div>

              <AnimatePresence>
                {confirmDelete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000]"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="bg-background border border-border rounded-xl shadow-xl p-8 w-full max-w-md text-center"
                    >
                      <h2 className="text-xl font-semibold mb-4">
                        Are you sure you want to delete this recipe?
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        This action cannot be undone.
                      </p>
                      <div className="flex justify-center gap-4">
                        <Button onClick={handleDelete} variant="destructive">
                          Yes, Delete
                        </Button>
                        <Button
                          onClick={() => setConfirmDelete(false)}
                          variant="secondary"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showShareModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10001]"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="bg-background border border-border rounded-xl shadow-xl p-8 w-full max-w-md text-center"
                    >
                      <h2 className="text-xl font-semibold mb-4">
                        Share this recipe
                      </h2>
                      <p className="text-muted-foreground mb-4">
                        Enter the email of the person you want to share this recipe with.
                      </p>
                      <Input
                        type="email"
                        placeholder="friend@example.com"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        className="mb-6"
                      />
                      <div className="flex justify-center gap-4">
                        <Button onClick={handleShareConfirm} className={blueButtonClasses}>
                          Share
                        </Button>
                        <Button
                          onClick={() => setShowShareModal(false)}
                          variant="secondary"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
