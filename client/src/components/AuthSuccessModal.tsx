import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface AuthSuccessModalProps {
  show: boolean;
  type: "signup" | "login";
  onClose: () => void;
}

export default function AuthSuccessModal({ show, type, onClose }: AuthSuccessModalProps) {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    onClose();
    setLocation("/"); // redirect to home
  };

  const message =
    type === "signup"
      ? "✅ Thanks for Creating an Account!"
      : "👋 Thanks for Logging In!";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-background rounded-2xl p-8 shadow-xl text-center max-w-md w-[90%]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <h2 className="text-2xl font-semibold mb-4">{message}</h2>
            <p className="text-muted-foreground mb-6">
              You can now start exploring recipes on DigiCook.
            </p>
            <Button onClick={handleGoHome} className="px-6 py-2 text-lg">
              Go to Home
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
