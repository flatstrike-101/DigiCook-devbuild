import { Link, useLocation } from "wouter";
import { Settings, PlusCircle, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import LogOutConfirmModal from "./LogOutConfirmModal";
import Notifications from "./Notifications";

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutModal(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSettingsClick = () => {
    if (!auth.currentUser) {
      setLocation("/login");
      return;
    }
    onOpenSettings();
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* SETTINGS BUTTON (replaces DigiCook logo) */}
          <button onClick={handleSettingsClick}>
            <Settings className="h-6 w-6 cursor-pointer" />
          </button>

          {/* MAIN NAVIGATION */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/" data-testid="link-browse">
              <Button variant="ghost" size="sm">
                Browse Recipes
              </Button>
            </Link>

            <Link href="/my-recipes" data-testid="link-my-recipes">
              <Button variant="ghost" size="sm">
                My Recipes
              </Button>
            </Link>

            <Link href="/add-recipe" data-testid="link-add-recipe">
              <Button variant="ghost" size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Recipe
              </Button>
            </Link>
          </nav>

          {/* RIGHT SIDE — NOTIFICATIONS + AUTH BUTTONS */}
          <div className="flex items-center gap-3">
            {user && <Notifications userEmail={user.email} />}

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
                  <Button variant="ghost" className="flex items-center gap-2 text-lg">
                    <User className="h-6 w-6" />
                    <span>Sign In</span>
                  </Button>
                </Link>

                <Link href="/register" data-testid="link-register">
                  <Button variant="ghost" className="flex items-center gap-2 text-lg">
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* LOGOUT CONFIRM MODAL */}
      <LogOutConfirmModal
        show={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
}
