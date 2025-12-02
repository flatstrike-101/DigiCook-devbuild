import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export async function updateUsername(newUsername: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in.");

  const uid = user.uid;

  // --- 1. Check if new username exists ---
  const usernameRef = doc(db, "usernames", newUsername);
  const usernameSnap = await getDoc(usernameRef);

  if (usernameSnap.exists()) {
    throw new Error("Username is already taken.");
  }

  // --- 2. Fetch user's current username ---
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User record not found.");
  }

  const oldUsername = userSnap.data().username;

  // --- 3. Delete the old username index ---
  if (oldUsername) {
    const oldRef = doc(db, "usernames", oldUsername);
    await deleteDoc(oldRef);
  }

  // --- 4. Create new username index ---
  await setDoc(doc(db, "usernames", newUsername), { uid });

  // --- 5. Update user's profile ---
  await updateDoc(userRef, { username: newUsername });

  return true;
}
