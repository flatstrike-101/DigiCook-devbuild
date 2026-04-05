import { Link, useLocation } from "wouter";
import { Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import LogOutConfirmModal from "./LogOutConfirmModal";
import Notifications from "./Notifications";
import UserAvatar from "./UserAvatar";

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const [, setLocation] = useLocation();

  const [user, setUser] = useState<any>(null);
  const [displayUsername, setDisplayUsername] = useState<string>("");
  const [displayFullName, setDisplayFullName] = useState<string>("");
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setDisplayUsername("");
        setDisplayFullName("");
        setProfileImageUrl("");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          setDisplayUsername(data.displayUsername || data.username || currentUser.email || "");
          setDisplayFullName(data.fullName || data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim());
          setProfileImageUrl(data.profileImageUrl || data.photoURL || currentUser.photoURL || "");
        } else {
          setDisplayUsername(currentUser.email || "");
          setDisplayFullName("");
          setProfileImageUrl(currentUser.photoURL || "");
        }
      } catch {
        setDisplayUsername(currentUser.email || "");
        setDisplayFullName("");
        setProfileImageUrl(currentUser.photoURL || "");
      }
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

            <Link href="/assistant">
              <Button variant="ghost" size="sm">
                Assistant
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-3 justify-self-end">
            {user && <Notifications userId={user.uid} />}

            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setLocation(`/profile/${user.uid}`)}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Open profile"
                  title="Open profile"
                >
                  <UserAvatar
                    photoURL={profileImageUrl}
                    username={displayUsername}
                    fullName={displayFullName}
                    className="h-9 w-9"
                    fallbackClassName="text-sm font-semibold"
                  />
                </button>
                <Button
                  onClick={() => setShowLogoutModal(true)}
                  variant="ghost"
                  className="flex items-center gap-2 px-4 py-2 text-lg text-red-400 hover:text-red-300"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Log Out</span>
                </Button>
              </>
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
