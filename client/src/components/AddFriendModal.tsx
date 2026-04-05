import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AddFriendModalProps = {
  show: boolean;
  onClose: () => void;
  onSend: (username: string) => Promise<void> | void;
  loading?: boolean;
};

export default function AddFriendModal({
  show,
  onClose,
  onSend,
  loading = false,
}: AddFriendModalProps) {
  const [username, setUsername] = useState("");

  if (!show) return null;

  const handleSubmit = async () => {
    const value = username.trim();
    if (!value || loading) return;
    await onSend(value);
    setUsername("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center">
      <div className="bg-background border border-border rounded-xl shadow-xl p-6 w-full max-w-md relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold mb-2">Add Friend</h2>
        <p className="text-muted-foreground mb-4">
          Enter a username to send a friend request.
        </p>

        <div className="space-y-4">
          <Input
            autoFocus
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={loading}
          />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900"
              onClick={handleSubmit}
              disabled={loading || !username.trim()}
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
