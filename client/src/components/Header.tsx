import { Link } from "wouter";
import { Moon, Sun, User, PlusCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import LogOutConfirmModal from "./LogOutConfirmModal";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser);
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutModal(false);
      console.log("👋 Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo / Home link */}
          <Link href="/" data-testid="link-home">
            <h1 className="text-xl font-semibold">DigiCook</h1>
          </Link>

          {/* Navigation links */}
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

          {/* Right-side authentication buttons */}
          <div className="flex items-center gap-2">
            {user ? (
              <Button
                onClick={() => setShowLogoutModal(true)}
                variant="ghost"
                className="flex items-center gap-2 px-4 py-2 text-lg text-red-400 hover:text-red-300"
              >
                <LogOut className="h-5 w-5" />
                <span>Log Out</span>
              </Button>
            ) : (
              <>
                <Link href="/login" data-testid="link-login">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-4 py-2 text-lg"
                  >
                    <User className="h-6 w-6" />
                    <span>Sign In</span>
                  </Button>
                </Link>

                <Link href="/register" data-testid="link-register">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-4 py-2 text-lg"
                  >
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogOutConfirmModal
        show={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
}