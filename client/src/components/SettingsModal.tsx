import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePassword,
} from "firebase/auth";

import { updateUsername } from "@/utils/updateUsername";

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

type Mode = "main" | "changeUsername" | "changeEmail" | "changePassword";

export default function SettingsModal({ show, onClose }: SettingsModalProps) {
  const [mode, setMode] = useState<Mode>("main");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailPasswordConfirm, setEmailPasswordConfirm] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!show) return;

    const loadUser = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setEmail(user.email || "");

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username || "");
      }
    };

    loadUser();
  }, [show]);

  if (!show) return null;

  const handleSaveUsername = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return alert("Not signed in.");

      if (!newUsername.trim()) {
        setErrorMsg("Username cannot be empty.");
        return;
      }

      setSaving(true);
      setErrorMsg("");

      const credential = EmailAuthProvider.credential(email, passwordConfirm);
      await reauthenticateWithCredential(user, credential);

      await updateUsername(newUsername);

      setUsername(newUsername);
      setNewUsername("");
      setPasswordConfirm("");

      setMode("main");
      alert("Username updated successfully.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error updating username.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setEmailError("Not signed in.");
        return;
      }

      if (!newEmail.trim()) {
        setEmailError("Email cannot be empty.");
        return;
      }

      setEmailSaving(true);
      setEmailError("");

      const credential = EmailAuthProvider.credential(
        email,
        emailPasswordConfirm
      );
      await reauthenticateWithCredential(user, credential);

      await verifyBeforeUpdateEmail(user, newEmail);

      alert(
        `A verification link has been sent to ${newEmail}. Open that email to finish the change.`
      );

      setMode("main");
      setNewEmail("");
      setEmailPasswordConfirm("");
    } catch (err: any) {
      console.error(err);
      setEmailError(err.message || "Error starting email change.");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSavePassword = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setPasswordError("Not signed in.");
        return;
      }

      if (!currentPassword.trim() || !newPassword.trim()) {
        setPasswordError("Fill in all fields.");
        return;
      }

      if (newPassword.length < 6) {
        setPasswordError("New password must be at least 6 characters.");
        return;
      }

      if (newPassword !== newPasswordConfirm) {
        setPasswordError("New passwords do not match.");
        return;
      }

      setPasswordSaving(true);
      setPasswordError("");

      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");

      alert("Password updated successfully.");
      setMode("main");
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message || "Error changing password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-background w-full max-w-2xl rounded-xl shadow-xl p-8 z-[21000]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {mode === "main"
              ? "Settings"
              : mode === "changeUsername"
              ? "Change Username"
              : mode === "changeEmail"
              ? "Change Email"
              : "Change Password"}
          </h2>
          <button onClick={onClose}>
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* MAIN */}
        {mode === "main" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Username</p>
                <p className="text-base text-muted-foreground">{username}</p>
              </div>

              <Button
                size="sm"
                className="bg-blue-950 text-white hover:bg-blue-900 !border-blue-950"
                onClick={() => {
                  setMode("changeUsername");
                  setNewUsername("");
                  setPasswordConfirm("");
                  setErrorMsg("");
                }}
              >
                Change Username
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Email</p>
                <p className="text-base text-muted-foreground">{email}</p>
              </div>

              <Button
                size="sm"
                className="bg-blue-950 text-white hover:bg-blue-900 !border-blue-950"
                onClick={() => {
                  setMode("changeEmail");
                  setNewEmail("");
                  setEmailPasswordConfirm("");
                  setEmailError("");
                }}
              >
                Change Email
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Change Password</p>
              <Button
                size="sm"
                className="bg-blue-950 text-white hover:bg-blue-900 !border-blue-950"
                onClick={() => {
                  setMode("changePassword");
                  setCurrentPassword("");
                  setNewPassword("");
                  setNewPasswordConfirm("");
                  setPasswordError("");
                }}
              >
                Change Password
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold">Select a Theme (WIP)</p>
              <select className="w-full p-3 border rounded-md bg-background text-base">
                <option disabled>Select a theme…</option>
              </select>
            </div>
          </div>
        )}

        {/* CHANGE USERNAME */}
        {mode === "changeUsername" && (
          <div className="space-y-6">
            {errorMsg && <p className="text-red-400">{errorMsg}</p>}

            <div className="space-y-2">
              <p className="text-lg font-semibold">Enter New Username</p>
              <input
                type="text"
                className="w-full p-3 rounded-md bg-background border"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold">Enter Password to Confirm</p>
              <input
                type="password"
                className="w-full p-3 rounded-md bg-background border"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                className="!border-gray-700"
                onClick={() => setMode("main")}
              >
                Cancel
              </Button>

              <Button
                className="bg-blue-950 text-white !border-blue-950"
                onClick={handleSaveUsername}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* CHANGE EMAIL */}
        {mode === "changeEmail" && (
          <div className="space-y-6">
            {emailError && <p className="text-red-400">{emailError}</p>}

            <div className="space-y-2">
              <p className="text-lg font-semibold">Enter New Email</p>
              <input
                type="email"
                className="w-full p-3 rounded-md bg-background border"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold">Enter Password to Confirm</p>
              <input
                type="password"
                className="w-full p-3 rounded-md bg-background border"
                value={emailPasswordConfirm}
                onChange={(e) => setEmailPasswordConfirm(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                className="!border-gray-700"
                onClick={() => setMode("main")}
              >
                Cancel
              </Button>

              <Button
                className="bg-blue-950 text-white !border-blue-950"
                onClick={handleSaveEmail}
                disabled={emailSaving}
              >
                {emailSaving ? "Sending..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* CHANGE PASSWORD */}
        {mode === "changePassword" && (
          <div className="space-y-6">
            {passwordError && <p className="text-red-400">{passwordError}</p>}

            <div className="space-y-2">
              <p className="text-lg font-semibold">Current Password</p>
              <input
                type="password"
                className="w-full p-3 rounded-md bg-background border"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold">New Password</p>
              <input
                type="password"
                className="w-full p-3 rounded-md bg-background border"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold">Confirm New Password</p>
              <input
                type="password"
                className="w-full p-3 rounded-md bg-background border"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                className="!border-gray-700"
                onClick={() => setMode("main")}
              >
                Cancel
              </Button>

              <Button
                className="bg-blue-950 text-white !border-blue-950"
                onClick={handleSavePassword}
                disabled={passwordSaving}
              >
                {passwordSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
