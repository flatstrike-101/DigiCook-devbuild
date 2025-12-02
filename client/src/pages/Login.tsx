import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import AuthSuccessModal from "@/components/AuthSuccessModal";

import { login } from "../auth";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    identifier: "", // email OR username
    password: "",
  });
  const [showModal, setShowModal] = useState(false);

  const resolveEmail = async (identifier: string): Promise<string> => {
    // If identifier contains @ → it's an email
    if (identifier.includes("@")) return identifier;

    // Otherwise treat as username
    const usernameLower = identifier.toLowerCase();
    const usernameRef = doc(db, "usernames", usernameLower);
    const usernameSnap = await getDoc(usernameRef);

    if (!usernameSnap.exists()) throw new Error("Username not found");

    const { uid } = usernameSnap.data() as { uid: string };

    // Get user’s email from Firestore
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) throw new Error("User profile not found");

    const { email } = userSnap.data() as { email: string };

    return email;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const email = await resolveEmail(formData.identifier);

      await login(email, formData.password);
      console.log("User logged in:", email);
      setShowModal(true);
    } catch (error: any) {
      console.error("Login error:", error);
      alert("❌ Login failed. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2">Sign In</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Username</Label>
            <Input
              id="identifier"
              type="text"
              value={formData.identifier}
              onChange={(e) =>
                setFormData({ ...formData, identifier: e.target.value })
              }
              data-testid="input-identifier"
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

          <Button
            type="submit"
            data-testid="button-login"
            className="w-full bg-blue-950 text-white border border-blue-950 
                       hover:bg-blue-900 hover:border-blue-900 
                       focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-0"
          >
            Sign In
          </Button>
        </form>
      </Card>

      <AuthSuccessModal
        show={showModal}
        type="login"
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
