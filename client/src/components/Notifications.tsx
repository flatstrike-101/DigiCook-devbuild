import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { db } from "../../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

type NotificationsProps = {
  userId: string;
};

type NotificationItem = {
  id: string;
  senderUid?: string;
  senderUsername?: string;
  type?: string;
  createdAt?: any;
};

function formatNotifTime(createdAt: any) {
  const date = createdAt?.toDate?.() ?? null;
  if (!date) return "just now";
  return formatDistanceToNow(date, { addSuffix: true });
}

function labelForType(type?: string) {
  if (type === "friend_request") return "sent you a friend request";
  if (type === "friend_accept") return "accepted your friend request";
  if (type === "comment") return "commented on your recipe";
  if (type === "score") return "rated your recipe";
  if (type === "like") return "liked your post";
  return "sent a notification";
}

export default function Notifications({ userId }: NotificationsProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, userId]);

  const clearOne = async (id: string) => {
    await deleteDoc(doc(db, "notifications", id));
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-2 hover:bg-muted"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-border bg-background shadow-xl z-[12000]">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <p className="text-sm font-semibold">Notifications</p>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={load}>
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No notifications</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((n) => (
                <div key={n.id} className="p-3">
                  <p className="text-sm">
                    <span className="font-semibold">@{n.senderUsername || "someone"}</span>{" "}
                    {labelForType(n.type)}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{formatNotifTime(n.createdAt)}</p>
                    <button
                      type="button"
                      onClick={() => clearOne(n.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
