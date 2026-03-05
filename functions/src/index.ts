import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { UserRecord } from "firebase-admin/auth";

admin.initializeApp();
const db = admin.firestore();

export const onUserDeleted = functions.auth.user().onDelete(
  async (user: UserRecord) => {
    const uid = user.uid;

    await db.doc(`users/${uid}`).delete().catch(() => {});

    const snap = await db.collection("usernames").where("uid", "==", uid).get();

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
);
