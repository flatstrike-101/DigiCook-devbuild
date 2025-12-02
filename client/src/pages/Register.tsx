import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { signup } from "../auth";
import AuthSuccessModal from "@/components/AuthSuccessModal";
import { db, auth } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Register() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("❌ Passwords do not match!");
      return;
    }

    const rawUsername = formData.username.trim();
    const id = rawUsername.toLowerCase();

    if (!id) {
      alert("❌ Username is required.");
      return;
    }

    if (!/^[a-z0-9_\.]+$/.test(id)) {
      alert("❌ Username can only contain letters, numbers, dots, and underscores.");
      return;
    }

    try {
      const usernameRef = doc(db, "usernames", id);
      const existing = await getDoc(usernameRef);
      if (existing.exists()) {
        alert("❌ That username is already taken. Please choose another.");
        return;
      }

      await signup(formData.email, formData.password);
      const user = auth.currentUser;
      if (!user) {
        alert("❌ Signup succeeded but user is not available. Please try logging in.");
        return;
      }

      await setDoc(usernameRef, { uid: user.uid });

      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          username: id,
          displayUsername: rawUsername,
          fullName: formData.name,
          email: formData.email,
        },
        { merge: true }
      );

      console.log("User registered:", formData.email);
      setShowModal(true);
    } catch (error) {
      console.error("Signup error:", error);
      alert("❌ Signup failed. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2">Sign Up</h1>
          <p className="text-muted-foreground">Start learning to cook today!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              data-testid="input-username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              data-testid="input-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              data-testid="input-confirm-password"
            />
          </div>

          <Button
            type="submit"
            data-testid="button-register"
            className="w-full bg-blue-950 text-white border border-blue-950 
                       hover:bg-blue-900 hover:border-blue-900 
                       focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-0"
          >
            Create Account
          </Button>
        </form>
      </Card>

      <AuthSuccessModal
        show={showModal}
        type="signup"
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
