import { Button } from "@/components/ui/button";

interface LogOutConfirmModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LogOutConfirmModal({
  show,
  onCancel,
  onConfirm,
}: LogOutConfirmModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]" style={{ top: "4rem" }}>
      <div className="bg-background border border-border rounded-xl shadow-xl p-8 w-full max-w-md text-center relative">
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Are you sure you want to log out?
        </h2>

        <div className="flex justify-center gap-4">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="px-5 py-2 text-base font-medium"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="px-5 py-2 text-base font-medium"
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
