import { useState, useEffect, useMemo } from "react";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { RecipeGrid } from "@/components/RecipeGrid";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Recipe } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [publicRecipes, setPublicRecipes] = useState<Recipe[]>([]);

  // 🔥 Fetch public recipes from Firestore
  useEffect(() => {
    const fetchPublicRecipes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "publicRecipes"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Recipe[];
        setPublicRecipes(data);
      } catch (error) {
        console.error("❌ Error loading public recipes:", error);
      }
    };

    fetchPublicRecipes();
  }, []);

  // 🔍 Filter recipes by search
  const filteredRecipes = useMemo(() => {
    return publicRecipes.filter((recipe) => {
      const matchesSearch =
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [publicRecipes, searchQuery]);

  return (
    <div className="min-h-screen">
      <Hero onSearch={setSearchQuery} />
      <SearchBar onSearch={setSearchQuery} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredRecipes.length > 0 ? (
          <RecipeGrid recipes={filteredRecipes} />
        ) : (
          <div className="text-center text-white text-lg py-12">
            No recipes found.
          </div>
        )}
      </div>
    </div>
  );
}
