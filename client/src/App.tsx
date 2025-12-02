import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import Home from "@/pages/Home";
import RecipeDetail from "@/pages/RecipeDetail";
import MyRecipes from "@/pages/MyRecipes";
import AddRecipe from "@/pages/AddRecipe";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/not-found";
import SettingsModal from "@/components/SettingsModal";
import { auth } from "../firebase";

function ProtectedRoute({ component: Component }) {
  const [, setLocation] = useLocation();

  if (!auth.currentUser) {
    setLocation("/login");
    return null;
  }

  return <Component />;
}

const MyRecipesProtected = () => <ProtectedRoute component={MyRecipes} />;
const AddRecipeProtected = () => <ProtectedRoute component={AddRecipe} />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recipe/:id" component={RecipeDetail} />
      <Route path="/my-recipes" component={MyRecipesProtected} />
      <Route path="/add-recipe" component={AddRecipeProtected} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {

  // SETTINGS STATE LIVES **HERE**
  const [showSettings, setShowSettings] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">

            {/* Pass function to Header */}
            <Header onOpenSettings={() => setShowSettings(true)} />

            <main className="flex-1">
              <Router />
            </main>

            {/* SETTINGS MODAL IS RENDERED HERE */}
            <SettingsModal
              show={showSettings}
              onClose={() => setShowSettings(false)}
            />

          </div>

          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
