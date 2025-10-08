import { Link } from "wouter";
import { Moon, Sun, User, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" data-testid="link-home">
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <Link href="/" data-testid="link-browse">
              <Button variant="ghost" size="sm">Browse Recipes</Button>
            </Link>
            <Link href="/my-recipes" data-testid="link-my-recipes">
              <Button variant="ghost" size="sm">My Recipes</Button>
            </Link>
            <Link href="/add-recipe" data-testid="link-add-recipe">
              <Button variant="ghost" size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Recipe
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* Sign In Button */}
            <Link href="/login" data-testid="link-login">
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-4 py-2 text-lg"
              >
                <User className="h-6 w-6" />
                <span>Sign In</span>
              </Button>
            </Link>

            {/* Sign Up Button */}
            <Link href="/register" data-testid="link-register">
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-4 py-2 text-lg"
              >
                <span>Sign Up</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
