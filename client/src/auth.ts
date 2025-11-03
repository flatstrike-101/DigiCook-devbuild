import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

// 🔹 Create a new user account
export async function signup(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("✅ User signed up:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
}

// 🔹 Log in an existing user
export async function login(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ User logged in:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// 🔹 Log out the current user
export async function logout() {
  try {
    await signOut(auth);
    console.log("✅ User logged out");
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
