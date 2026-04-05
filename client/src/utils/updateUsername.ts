import { auth, db } from "../../firebase";
import { doc, getDoc, runTransaction } from "firebase/firestore";

function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export async function updateUsername(newUsernameRaw: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");

  const newUsername = normalizeUsername(newUsernameRaw);
  if (!newUsername) throw new Error("Username cannot be empty.");

  const userRef = doc(db, "users", user.uid);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("User profile not found.");

    const currentData = userSnap.data() as any;
    const oldUsername = normalizeUsername(currentData.displayUsername || currentData.username || "");

    const newUsernameRef = doc(db, "usernames", newUsername);
    const usernameSnap = await tx.get(newUsernameRef);
    if (usernameSnap.exists() && usernameSnap.data()?.uid !== user.uid) {
      throw new Error("Username is already taken.");
    }

    if (oldUsername && oldUsername !== newUsername) {
      const oldUsernameRef = doc(db, "usernames", oldUsername);
      const oldSnap = await tx.get(oldUsernameRef);
      if (oldSnap.exists() && oldSnap.data()?.uid === user.uid) {
        tx.delete(oldUsernameRef);
      }
    }

    tx.set(newUsernameRef, { uid: user.uid });
    tx.update(userRef, {
      displayUsername: newUsername,
      username: newUsername,
    });
  });
}
