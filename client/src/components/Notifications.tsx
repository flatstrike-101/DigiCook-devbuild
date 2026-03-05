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
  writeBatch,
  updateDoc,
} from "firebase/firestore";

interface ShareNotification {
  id: string;
  recipeId: string;
  recipeTitle: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  createdAt?: any;
}

interface FriendRequest {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt?: any;
}

interface ReactionNotification {
  id: string;
  recipientId: string;
  type: "like" | "score";
  scoreValue?: number;
  senderUid?: string;
  senderUsername?: string;
  postId?: string;
  recipeTitle?: string;
  createdAt?: any;
}

type NotificationItem =
  | ({ kind: "share"; createdAt?: any } & ShareNotification)
  | ({ kind: "friend"; createdAt?: any } & FriendRequest)
  | ({ kind: "reaction"; createdAt?: any } & ReactionNotification);

interface Props {
  userId?: string | null;
}

const blueButtonClasses =
  "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900";

function clampScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export default function Notifications({ userId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadNotifications = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      const sharesQ = query(collection(db, "recipeShares"), where("toUid", "==", userId));
      const sharesSnap = await getDocs(sharesQ);
      const shares = sharesSnap.docs.map((docSnap) => ({
        kind: "share" as const,
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as NotificationItem[];

      const friendReqQ = query(
        collection(db, "friendRequests"),
        where("toUid", "==", userId),
        where("status", "==", "pending")
      );
      const friendReqSnap = await getDocs(friendReqQ);
      const friendReqs = friendReqSnap.docs.map((docSnap) => ({
        kind: "friend" as const,
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as NotificationItem[];

      const reactionsQ = query(collection(db, "notifications"), where("recipientId", "==", userId));
      const reactionsSnap = await getDocs(reactionsQ);
      const reactions = reactionsSnap.docs
        .map((docSnap) => ({
          kind: "reaction" as const,
          id: docSnap.id,
          ...(docSnap.data() as any),
        }))
        .filter((n: any) => n.type === "like" || n.type === "score") as NotificationItem[];

      const combined = [...friendReqs, ...shares, ...reactions];

      combined.sort((a, b) => {
        const ta = (a as any).createdAt?.toMillis?.() ?? 0;
        const tb = (b as any).createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });

      setNotifications(combined);
    } catch (err) {
      console.error("Error loading notifications:", err);
      toast({
        title: "Error loading notifications",
        description: "Something went wrong while loading notifications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) await loadNotifications();
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
        setNotifications((prev) => prev.filter((n) => !(n.kind === "share" && n.id === share.id)));
        return;
      }

      const recipeData = recipeSnap.data();

      await addDoc(collection(db, "recipes"), {
        ...recipeData,
        userId: currentUser.uid,
        sharedFrom: share.fromUsername,
        sharedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, "recipeShares", share.id));
      setNotifications((prev) => prev.filter((n) => !(n.kind === "share" && n.id === share.id)));

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
      setNotifications((prev) => prev.filter((n) => !(n.kind === "share" && n.id === share.id)));
    } catch (err) {
      console.error("Error declining share:", err);
      toast({
        title: "Error declining share",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptFriend = async (req: FriendRequest) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !userId) return;

      if (req.toUid !== userId) {
        toast({
          title: "Not allowed",
          description: "You can only accept requests sent to you.",
          variant: "destructive",
        });
        return;
      }

      const reqRef = doc(db, "friendRequests", req.id);

      const batch = writeBatch(db);

      batch.update(reqRef, {
        status: "accepted",
        respondedAt: serverTimestamp(),
      });

      const fromFriendRef = doc(db, "users", req.fromUid, "friends", req.toUid);
      const toFriendRef = doc(db, "users", req.toUid, "friends", req.fromUid);

      batch.set(fromFriendRef, {
        friendUid: req.toUid,
        friendUsername: req.toUsername,
        createdAt: serverTimestamp(),
        requestId: req.id,
      });

      batch.set(toFriendRef, {
        friendUid: req.fromUid,
        friendUsername: req.fromUsername,
        createdAt: serverTimestamp(),
        requestId: req.id,
      });

      await batch.commit();

      setNotifications((prev) => prev.filter((n) => !(n.kind === "friend" && n.id === req.id)));

      toast({
        title: "Friend added",
        description: `You and ${req.fromUsername} are now friends.`,
      });
    } catch (err) {
      console.error("Error accepting friend request:", err);
      toast({
        title: "Error accepting request",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineFriend = async (req: FriendRequest) => {
    try {
      if (!userId) return;
      if (req.toUid !== userId) return;

      await updateDoc(doc(db, "friendRequests", req.id), {
        status: "rejected",
        respondedAt: serverTimestamp(),
      });

      setNotifications((prev) => prev.filter((n) => !(n.kind === "friend" && n.id === req.id)));
    } catch (err) {
      console.error("Error declining friend request:", err);
      toast({
        title: "Error declining request",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!userId) return null;

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
              <p className="text-xs text-muted-foreground">No new notifications.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => {
                  if (item.kind === "share") {
                    const n = item as ShareNotification & { kind: "share" };
                    return (
                      <div
                        key={`share-${n.id}`}
                        className="border border-border rounded-md p-3 text-sm"
                      >
                        <p className="text-sm mb-3">
                          <span className="font-semibold">{n.fromUsername}</span> would like to share a recipe
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold">{n.recipeTitle}</span>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleDeclineShare(n)}>
                              Decline
                            </Button>

                            <Button size="sm" className={blueButtonClasses} onClick={() => handleAcceptShare(n)}>
                              Accept
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === "reaction") {
                    const n = item as ReactionNotification & { kind: "reaction" };
                    const fromName = n.senderUsername || "Someone";
                    const recipeTitle = n.recipeTitle || "your recipe";
                    const scoreValue = clampScore(n.scoreValue);

                    return (
                      <div
                        key={`reaction-${n.id}`}
                        className="border border-border rounded-md p-3 text-sm"
                      >
                        <p className="text-sm">
                          {n.type === "score" ? (
                            <>
                              <span className="font-semibold">{fromName}</span> rated your recipe{" "}
                              <span className="font-semibold">{scoreValue ?? 0}/5</span>:{" "}
                              <span className="font-semibold">{recipeTitle}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">{fromName}</span> liked your recipe:{" "}
                              <span className="font-semibold">{recipeTitle}</span>
                            </>
                          )}
                        </p>
                      </div>
                    );
                  }

                  const r = item as FriendRequest & { kind: "friend" };
                  return (
                    <div
                      key={`friend-${r.id}`}
                      className="border border-border rounded-md p-3 text-sm"
                    >
                      <p className="text-sm mb-3">
                        <span className="font-semibold">{r.fromUsername}</span> sent you a friend request
                      </p>

                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDeclineFriend(r)}>
                          Decline
                        </Button>

                        <Button size="sm" className={blueButtonClasses} onClick={() => handleAcceptFriend(r)}>
                          Accept
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
