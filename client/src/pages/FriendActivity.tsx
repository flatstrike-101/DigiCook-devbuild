import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, X } from "lucide-react";
import AddFriendModal from "@/components/AddFriendModal";

type FriendDoc = {
  friendUid: string;
  friendUsername?: string;
  createdAt?: any;
  requestId?: string;
};

type FriendDisplay = {
  uid: string;
  username: string;
  fullName: string;
};

const blueButtonClasses =
  "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900 flex items-center gap-2 px-4 py-2 rounded-md";

export default function FriendActivity() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [userUid, setUserUid] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string>("");

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [sending, setSending] = useState(false);

  const [friends, setFriends] = useState<FriendDisplay[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [confirmRemove, setConfirmRemove] = useState<FriendDisplay | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserUid(u?.uid ?? null);
      if (!u) setLocation("/login");
    });
    return () => unsub();
  }, [setLocation]);

  useEffect(() => {
    const loadMyUsername = async () => {
      const u = auth.currentUser;
      if (!u) return;

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          setMyUsername(
            data.displayUsername || data.username || data.userName || u.email || ""
          );
        } else {
          setMyUsername(u.email || "");
        }
      } catch {
        setMyUsername(u.email || "");
      }
    };

    if (userUid) loadMyUsername();
  }, [userUid]);

  const normalizeUsername = (raw: string) =>
    raw.trim().replace(/^@/, "").toLowerCase();

  const loadFriends = async () => {
    const u = auth.currentUser;
    if (!u) return;

    setLoadingFriends(true);
    try {
      const friendsSnap = await getDocs(collection(db, "users", u.uid, "friends"));
      const base = friendsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Array<{ id: string } & FriendDoc>;

      const displays: FriendDisplay[] = [];

      for (const f of base) {
        const friendUid = f.friendUid || f.id;

        let username = (f.friendUsername || "").toString();
        let fullName = "";

        try {
          const profileSnap = await getDoc(doc(db, "users", friendUid));
          if (profileSnap.exists()) {
            const p = profileSnap.data() as any;
            fullName =
              p.fullName ||
              p.name ||
              `${p.firstName || ""} ${p.lastName || ""}`.trim();
            if (!username) {
              username = p.displayUsername || p.username || p.userName || "";
            }
          }
        } catch {}

        if (!username) username = friendUid;
        if (!fullName) fullName = "Unknown";

        displays.push({
          uid: friendUid,
          username,
          fullName,
        });
      }

      displays.sort((a, b) => a.username.localeCompare(b.username));
      setFriends(displays);
    } catch (err) {
      console.error("Error loading friends:", err);
      toast({
        title: "Error loading friends",
        description: "Something went wrong while loading your friends list.",
        variant: "destructive",
      });
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    if (userUid) loadFriends();
  }, [userUid]);

  const sendFriendRequest = async (rawUsername: string) => {
    const fromUid = auth.currentUser?.uid;
    if (!fromUid) return;

    const toUsername = normalizeUsername(rawUsername);

    if (!toUsername) {
      toast({
        title: "Username required",
        description: "Enter a username to send a request.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const usernameRef = doc(db, "usernames", toUsername);
      const usernameSnap = await getDoc(usernameRef);

      if (!usernameSnap.exists()) {
        toast({
          title: "User not found",
          description: "No user with that username exists.",
          variant: "destructive",
        });
        return;
      }

      const data = usernameSnap.data() as any;
      const toUid = data.uid as string;

      if (!toUid) {
        toast({
          title: "Invalid user",
          description: "That username is not linked to a user.",
          variant: "destructive",
        });
        return;
      }

      if (toUid === fromUid) {
        toast({
          title: "Cannot add yourself",
          description: "Choose another username.",
          variant: "destructive",
        });
        return;
      }

      const requestId = `${fromUid}_${toUid}`;
      const requestRef = doc(db, "friendRequests", requestId);

      const { setDoc, serverTimestamp } = await import("firebase/firestore");

      await setDoc(requestRef, {
        fromUid,
        fromUsername: myUsername || auth.currentUser?.email || "",
        toUid,
        toUsername,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Friend request sent",
        description: `Request sent to @${toUsername}.`,
      });
      setShowAddFriend(false);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleRemoveFriend = async () => {
    const u = auth.currentUser;
    if (!u || !confirmRemove) return;

    setRemoving(true);
    try {
      await deleteDoc(doc(db, "users", u.uid, "friends", confirmRemove.uid));
      await deleteDoc(doc(db, "users", confirmRemove.uid, "friends", u.uid));

      setFriends((prev) => prev.filter((f) => f.uid !== confirmRemove.uid));
      setConfirmRemove(null);

      toast({
        title: "Friend removed",
        description: `Removed @${confirmRemove.username} from your friends.`,
      });
    } catch (err) {
      console.error("Error removing friend:", err);
      toast({
        title: "Error removing friend",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  const friendCountText = useMemo(() => {
    const n = friends.length;
    return `${n} ${n === 1 ? "friend" : "friends"}`;
  }, [friends.length]);

  return (
    <div className="min-h-screen">
      <div className="bg-muted/50 border-b py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">
                Friend Activity
              </h1>
              <p className="text-muted-foreground">
                Check out what your friends are cooking up.
              </p>
            </div>

            <Button
              onClick={() => setShowAddFriend(true)}
              className={blueButtonClasses}
              disabled={sending}
            >
              <PlusCircle className="h-4 w-4" />
              Add Friend
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="rounded-xl border p-6">
              <p className="text-muted-foreground">
                Friend activity feed will go here.
              </p>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold">Friends</h2>
              <p className="text-muted-foreground text-sm">{friendCountText}</p>
            </div>

            {loadingFriends ? (
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  No friends yet. Add one to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((f) => (
                  <Card
                    key={f.uid}
                    onClick={() => setConfirmRemove(f)}
                    className="cursor-pointer p-4 hover:shadow-lg transition-shadow border border-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{f.fullName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{f.username}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        Remove
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddFriendModal
        show={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onSend={sendFriendRequest}
        loading={sending}
      />

      {confirmRemove && (
        <div className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center">
          <div className="bg-background border border-border rounded-xl shadow-xl p-6 w-full max-w-md relative">
            <button
              type="button"
              onClick={() => setConfirmRemove(null)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-semibold mb-2">Remove Friend</h2>
            <p className="text-muted-foreground mb-6">
              Remove <span className="font-semibold">@{confirmRemove.username}</span>{" "}
              from your friends list?
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmRemove(null)}
                disabled={removing}
              >
                Cancel
              </Button>
              <Button
                className={blueButtonClasses}
                onClick={handleRemoveFriend}
                disabled={removing}
              >
                {removing ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
