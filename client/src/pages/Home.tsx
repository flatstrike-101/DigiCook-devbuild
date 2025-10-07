import { useState, useMemo } from "react";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { RecipeGrid } from "@/components/RecipeGrid";
import { starterRecipes } from "@/lib/starterRecipes";
import { getPersonalRecipes } from "@/lib/localStorage";
import { Recipe } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  // Combine starter recipes with personal recipes
  const allRecipes = useMemo(() => {
    const personal = getPersonalRecipes();
    return [...starterRecipes, ...personal];
  }, []);

  // Filter recipes based on search
  const filteredRecipes = useMemo(() => {
    return allRecipes.filter((recipe: Recipe) => {
      const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [allRecipes, searchQuery]);

  return (
    <div className="min-h-screen">
      <Hero onSearch={setSearchQuery} />
      <SearchBar onSearch={setSearchQuery} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
        </div>
        
        <RecipeGrid recipes={filteredRecipes} />
      </div>
    </div>
  );
}
