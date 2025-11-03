import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { login } from "../auth";
import AuthSuccessModal from "@/components/AuthSuccessModal";

export default function Login() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      console.log("User logged in:", formData.email);
      setShowModal(true);
    } catch (error) {
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

      {/* ✅ Success Modal */}
      <AuthSuccessModal
        show={showModal}
        type="login"
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
