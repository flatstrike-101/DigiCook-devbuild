import { Link, useLocation } from "wouter";
import { Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setShowLogoutModal(false);
    setLocation("/login");
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
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16">
          <button onClick={handleSettingsClick} className="justify-self-start">
            <Settings className="h-6 w-6 cursor-pointer" />
          </button>

          <nav className="hidden md:flex items-center gap-3 justify-self-center">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Browse Recipes
              </Button>
            </Link>

            <Link href="/my-recipes">
              <Button variant="ghost" size="sm">
                My Recipes
              </Button>
            </Link>

            <Link href="/friends">
              <Button variant="ghost" size="sm">
                Friend Activity
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-3 justify-self-end">
            {user && <Notifications userId={user.uid} />}

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
                <Link href="/login">
                  <Button variant="ghost" className="flex items-center gap-2 text-lg">
                    <User className="h-6 w-6" />
                    <span>Sign In</span>
                  </Button>
                </Link>

                <Link href="/register">
                  <Button variant="ghost" className="flex items-center gap-2 text-lg">
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <LogOutConfirmModal
        show={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
}
