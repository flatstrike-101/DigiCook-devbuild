import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

interface ShareNotification {
  id: string;
  recipeId: string;
  recipeTitle: string;
  fromEmail: string;
  toEmail: string;
  createdAt?: any;
}

interface Props {
  userEmail?: string | null;
}

const blueButtonClasses =
  "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900";

export default function Notifications({ userEmail }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ShareNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadNotifications = async () => {
    if (!userEmail) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, "recipeShares"),
        where("toEmail", "==", userEmail)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as ShareNotification[];
      setNotifications(data);
    } catch (err) {
      console.error("Error loading notifications:", err);
      toast({
        title: "Error loading notifications",
        description: "Something went wrong while loading recipe shares.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      await loadNotifications();
    }
  };

  const handleAcceptShare = async (share: ShareNotification) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast({
          title: "Not signed in",
          description: "You must be signed in to accept a shared recipe.",
          variant: "destructive",
        });
        return;
      }

      const recipeRef = doc(db, "recipes", share.recipeId);
      const recipeSnap = await getDoc(recipeRef);

      if (!recipeSnap.exists()) {
        toast({
          title: "Recipe not found",
          description: "The original recipe no longer exists.",
          variant: "destructive",
        });
        await deleteDoc(doc(db, "recipeShares", share.id));
        setNotifications((prev) => prev.filter((n) => n.id !== share.id));
        return;
      }

      const recipeData = recipeSnap.data();

      await addDoc(collection(db, "recipes"), {
        ...recipeData,
        userId: currentUser.uid,
        sharedFrom: share.fromEmail,
        sharedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, "recipeShares", share.id));
      setNotifications((prev) => prev.filter((n) => n.id !== share.id));

      toast({
        title: "Recipe added",
        description: `"${share.recipeTitle}" has been added to your recipes.`,
      });
    } catch (err) {
      console.error("Error accepting share:", err);
      toast({
        title: "Error accepting share",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineShare = async (share: ShareNotification) => {
    try {
      await deleteDoc(doc(db, "recipeShares", share.id));
      setNotifications((prev) => prev.filter((n) => n.id !== share.id));
    } catch (err) {
      console.error("Error declining share:", err);
      toast({
        title: "Error declining share",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!userEmail) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        className="flex items-center justify-center h-10 w-10 rounded-full"
        onClick={toggleOpen}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 rounded-lg border bg-background shadow-lg z-[10000]">
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3">Notifications</h3>

            {loading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No new recipe share requests.
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="border border-border rounded-md p-3 text-sm"
                  >
                    <p className="text-sm mb-3">
                      <span className="font-semibold">{n.fromEmail}</span>{" "}
                      would like to share a recipe
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold">
                        {n.recipeTitle}
                      </span>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineShare(n)}
                        >
                          Decline
                        </Button>

                        <Button
                          size="sm"
                          className={blueButtonClasses}
                          onClick={() => handleAcceptShare(n)}
                        >
                          Accept
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
