import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { useTheme } from "@/components/ThemeProvider";
import UserAvatar from "@/components/UserAvatar";

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

type Mode = "main" | "changeUsername" | "changeEmail" | "changePassword";

function ensureDirectImageUrl(url: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      img.src = "";
      reject(new Error("That link is not a direct image URL."));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error("That link is not a direct image URL."));
    };

    img.src = url;
  });
}

export default function SettingsModal({ show, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
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
  const [showProfileStats, setShowProfileStats] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileImageInput, setProfileImageInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [savingProfileImage, setSavingProfileImage] = useState(false);

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
        setUsername(data.displayUsername || data.username || "");
        setFullName(data.fullName || data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim());
        setShowProfileStats(data.showProfileStats !== false);
        const imageUrl = data.profileImageUrl || data.photoURL || user.photoURL || "";
        setProfileImageUrl(imageUrl);
        setProfileImageInput(imageUrl);
      } else {
        setShowProfileStats(true);
        setFullName("");
        const imageUrl = user.photoURL || "";
        setProfileImageUrl(imageUrl);
        setProfileImageInput(imageUrl);
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

  const handleToggleProfileStats = async (checked: boolean) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Not signed in.");
        return;
      }

      setSavingPrivacy(true);
      setShowProfileStats(checked);
      await updateDoc(doc(db, "users", user.uid), {
        showProfileStats: checked,
      });
    } catch (err) {
      console.error(err);
      // Revert optimistic toggle if save fails.
      setShowProfileStats((prev) => !prev);
      alert("Could not update privacy setting. Please try again.");
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleSaveProfileImageUrl = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Not signed in.");
      return;
    }
    const imageUrl = profileImageInput.trim();
    if (imageUrl && !/^https?:\/\/.+/i.test(imageUrl)) {
      alert("Please enter a valid image URL that starts with http:// or https://");
      return;
    }

    try {
      setSavingProfileImage(true);
      if (imageUrl) {
        await ensureDirectImageUrl(imageUrl);
      }
      await updateDoc(doc(db, "users", user.uid), {
        profileImageUrl: imageUrl || null,
      });

      setProfileImageUrl(imageUrl);
      alert("Profile picture updated.");
    } catch (err: any) {
      console.error(err);
      const message = err?.message || "Could not update profile picture. Please try again.";
      alert(message);
    } finally {
      setSavingProfileImage(false);
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
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  photoURL={profileImageUrl}
                  username={username}
                  fullName={fullName}
                  className="h-14 w-14"
                  fallbackClassName="text-lg font-semibold"
                />
                <div>
                  <p className="text-lg font-semibold">Profile Picture</p>
                  <p className="text-sm text-muted-foreground">
                    Paste an image URL or leave blank for your name initial fallback.
                  </p>
                </div>
              </div>

              <div className="w-full max-w-sm space-y-2">
                <input
                  type="url"
                  className="w-full p-2 rounded-md bg-background border text-sm"
                  placeholder="https://example.com/avatar.png"
                  value={profileImageInput}
                  onChange={(e) => setProfileImageInput(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProfileImageInput("")}
                    disabled={savingProfileImage}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-950 text-white hover:bg-blue-900 !border-blue-950"
                    onClick={handleSaveProfileImageUrl}
                    disabled={savingProfileImage}
                  >
                    {savingProfileImage ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Username:</p>
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
              <p className="text-lg font-semibold">Select a Theme</p>
              <select
                className="w-full p-3 border rounded-md bg-background text-base"
                value={theme}
                onChange={(e) =>
                  setTheme(
                    e.target.value as
                      | "light"
                      | "dark"
                      | "navy"
                      | "red"
                  )
                }
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="navy">Navy</option>
                <option value="red">Red</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="pr-4">
                <p className="text-lg font-semibold">Show Profile Statistics</p>
                <p className="text-sm text-muted-foreground">
                  Allow others to see your public account stats on your profile page.
                </p>
              </div>

              <Switch
                className="profile-stats-switch"
                checked={showProfileStats}
                disabled={savingPrivacy}
                onCheckedChange={handleToggleProfileStats}
                aria-label="Toggle profile stats visibility"
              />
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

