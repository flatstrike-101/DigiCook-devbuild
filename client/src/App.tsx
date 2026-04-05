import { type ComponentType, useState } from "react";
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
import EditRecipe from "@/pages/EditRecipe";
import FriendActivity from "@/pages/FriendActivity";
import Profile from "@/pages/Profile";
import Assistant from "@/pages/Assistant";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/not-found";
import SettingsModal from "@/components/SettingsModal";
import { auth } from "../firebase";

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  const [, setLocation] = useLocation();
  if (!auth.currentUser) {
    setLocation("/login");
    return null;
  }
  return <Component />;
}

const MyRecipesProtected = () => <ProtectedRoute component={MyRecipes} />;
const AddRecipeProtected = () => <ProtectedRoute component={AddRecipe} />;
const EditRecipeProtected = () => <ProtectedRoute component={EditRecipe} />;
const FriendActivityProtected = () => <ProtectedRoute component={FriendActivity} />;
const ProfileProtected = () => <ProtectedRoute component={Profile} />;
const AssistantProtected = () => <ProtectedRoute component={Assistant} />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recipe/:id" component={RecipeDetail} />
      <Route path="/my-recipes" component={MyRecipesProtected} />
      <Route path="/add-recipe" component={AddRecipeProtected} />
      <Route path="/edit-recipe/:id" component={EditRecipeProtected} />
      <Route path="/friends" component={FriendActivityProtected} />
      <Route path="/profile/:uid" component={ProfileProtected} />
      <Route path="/assistant" component={AssistantProtected} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            <Header onOpenSettings={() => setShowSettings(true)} />
            <main className="flex-1">
              <Router />
            </main>
            <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} />
          </div>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
