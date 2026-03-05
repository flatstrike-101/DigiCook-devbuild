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
  getDoc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Recipe {
  id: string;
  userId?: string;
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: string; unit?: string }>;
  steps: string[];
  createdAt?: any;
  originalChefName?: string;
  originalChefUid?: string;
  sourceRecipeId?: string;
}

export default function MyRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUsername, setShareUsername] = useState("");

  const [publishing, setPublishing] = useState(false);

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
          ...(docSnap.data() as any),
        })) as Recipe[];

        setRecipes(data);
      } catch (err) {
        console.error("Error loading recipes:", err);
        toast({
          title: "Error loading recipes",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchRecipes();
  }, [toast]);

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
    setShareUsername("");
    setShowShareModal(true);
  };

  const getFromDisplay = async (uid: string) => {
    let fromDisplay = "";

    try {
      const usernamesRef = collection(db, "usernames");
      const usernameQuery = query(usernamesRef, where("uid", "==", uid));
      const usernameSnapForSender = await getDocs(usernameQuery);

      if (!usernameSnapForSender.empty) {
        fromDisplay = usernameSnapForSender.docs[0].id;
      }
    } catch {}

    if (!fromDisplay) {
      try {
        const fromProfileSnap = await getDoc(doc(db, "users", uid));
        if (fromProfileSnap.exists()) {
          const profile = fromProfileSnap.data() as any;
          fromDisplay =
            profile.displayUsername ||
            profile.username ||
            profile.userName ||
            auth.currentUser?.email ||
            "";
        } else {
          fromDisplay = auth.currentUser?.email ?? "";
        }
      } catch {
        fromDisplay = auth.currentUser?.email ?? "";
      }
    }

    return fromDisplay;
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

    const raw = shareUsername.trim();
    const usernameId = raw.replace(/^@/, "").toLowerCase();

    if (!usernameId) {
      toast({
        title: "Username required",
        description: "Please enter a username to share this recipe with.",
        variant: "destructive",
      });
      return;
    }

    try {
      const usernameRef = doc(db, "usernames", usernameId);
      const usernameSnap = await getDoc(usernameRef);

      if (!usernameSnap.exists()) {
        toast({
          title: "User not found",
          description: "No user with that username exists.",
          variant: "destructive",
        });
        return;
      }

      const data = usernameSnap.data() as any;
      const toUid = data.uid as string;

      if (toUid === user.uid) {
        toast({
          title: "Cannot share to yourself",
          description: "Choose another username.",
          variant: "destructive",
        });
        return;
      }

      const fromDisplay = await getFromDisplay(user.uid);

      await addDoc(collection(db, "recipeShares"), {
        recipeId: selected.id,
        recipeTitle: selected.title,
        fromUid: user.uid,
        fromUsername: fromDisplay,
        toUid,
        createdAt: serverTimestamp(),
      });

      setShowShareModal(false);
      toast({
        title: "Recipe shared",
        description: `Share request sent to @${usernameId}.`,
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

  const handlePublishToFriendActivity = async () => {
    if (!selected) return;

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Not signed in",
        description: "You must be signed in to publish a recipe.",
        variant: "destructive",
      });
      return;
    }

    const isCopiedRecipe =
      !!selected.sourceRecipeId ||
      (!!selected.originalChefUid && selected.originalChefUid !== user.uid);

    if (isCopiedRecipe) {
      toast({
        title: "Cannot publish copied recipe",
        description: "Only recipes you created can be published to Friend Activity.",
        variant: "destructive",
      });
      return;
    }

    setPublishing(true);
    try {
      const authorUsername = await getFromDisplay(user.uid);

      const profileSnap = await getDoc(doc(db, "users", user.uid));
      let authorFullName = "Unknown";
      if (profileSnap.exists()) {
        const p = profileSnap.data() as any;
        authorFullName =
          p.fullName || p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown";
      }

      await addDoc(collection(db, "friendFeed"), {
        authorUid: user.uid,
        authorUsername,
        authorFullName,
        recipeId: selected.id,
        title: selected.title,
        description: selected.description,
        ingredients: selected.ingredients || [],
        steps: selected.steps || [],
        createdAt: serverTimestamp(),
      });

      setShowShareModal(false);
      toast({
        title: "Published",
        description: "Your recipe is now visible in Friend Activity.",
      });
    } catch (err) {
      console.error("Error publishing to feed:", err);
      toast({
        title: "Error publishing",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  const blueButtonClasses =
    "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900 flex items-center gap-2 px-4 py-2 rounded-md";

  const canPublishSelectedRecipe =
    !!selected &&
    !!auth.currentUser &&
    !selected.sourceRecipeId &&
    (!selected.originalChefUid || selected.originalChefUid === auth.currentUser.uid);

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
            <p className="text-muted-foreground text-lg">No recipes found</p>
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
                  <h2 className="font-serif text-2xl font-semibold mb-2">{recipe.title}</h2>
                  <p className="text-muted-foreground line-clamp-3">{recipe.description}</p>
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

              <h2 className="text-3xl font-serif font-semibold mb-4">{selected.title}</h2>
              <p className="mb-2 text-muted-foreground">{selected.description}</p>

              {selected.originalChefName ? (
                <p className="mb-6 text-sm text-muted-foreground">
                  <span className="font-semibold">Original Chef:</span> {selected.originalChefName}
                </p>
              ) : (
                <div className="mb-6" />
              )}

              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-lg">Ingredients</h3>
                <ul className="list-disc list-inside space-y-1">
                  {selected.ingredients?.map((ing, i) => (
                    <li key={i}>
                      {ing.amount} {ing.unit} {ing.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-lg">Steps</h3>
                <ol className="list-decimal list-inside space-y-1">
                  {selected.steps?.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Button
                  onClick={() => {
                    const id = selected.id;
                    setSelected(null);
                    setLocation(`/edit-recipe/${id}`);
                  }}
                  className={blueButtonClasses}
                >
                  Edit Recipe
                </Button>

                <div className="flex items-center gap-2">
                  <Button onClick={() => setConfirmDelete(true)} variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <Button onClick={openShareModal} className={blueButtonClasses}>
                    Share Recipe
                  </Button>
                </div>
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
                      <p className="text-muted-foreground mb-6">This action cannot be undone.</p>
                      <div className="flex justify-center gap-4">
                        <Button onClick={handleDelete} variant="destructive">
                          Yes, Delete
                        </Button>
                        <Button onClick={() => setConfirmDelete(false)} variant="secondary">
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
                      <h2 className="text-xl font-semibold mb-4">Share this recipe</h2>
                      <p className="text-muted-foreground mb-4">
                        Enter the username of the person you want to share this recipe with.
                      </p>

                      <Input
                        type="text"
                        placeholder="Enter username"
                        value={shareUsername}
                        onChange={(e) => setShareUsername(e.target.value)}
                        className="mb-6"
                      />

                      <div className="flex flex-col gap-3">
                        <Button onClick={handleShareConfirm} className={blueButtonClasses}>
                          Share
                        </Button>

                        {canPublishSelectedRecipe ? (
                          <Button
                            onClick={handlePublishToFriendActivity}
                            className={blueButtonClasses}
                            disabled={publishing}
                          >
                            {publishing ? "Publishing..." : "Publish to Friend Activity"}
                          </Button>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Only recipes you created can be published to Friend Activity.
                          </p>
                        )}

                        <Button onClick={() => setShowShareModal(false)} variant="secondary">
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
