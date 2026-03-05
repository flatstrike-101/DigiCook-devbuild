import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface AddFriendModalProps {
  show: boolean;
  onClose: () => void;
  onSend: (username: string) => Promise<void> | void;
  loading?: boolean;
}

export default function AddFriendModal({
  show,
  onClose,
  onSend,
  loading,
}: AddFriendModalProps) {
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (show) setUsername("");
  }, [show]);

  const submit = async () => {
    await onSend(username);
  };

  const blueButtonClasses =
    "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-border bg-background shadow-xl p-8 relative"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-semibold mb-2">Add Friend</h2>
            <p className="text-muted-foreground mb-6">
              Enter a username to send a friend request.
            </p>

            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              disabled={!!loading}
              className="mb-6"
            />

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose} disabled={!!loading}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={!!loading}
                className={blueButtonClasses}
              >
                {loading ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
