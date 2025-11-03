import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAUwQhIBpyvubYME6e0oydxPn_u5DwJUDg",
  authDomain: "digicook-2ecbe.firebaseapp.com",
  projectId: "digicook-2ecbe",
  storageBucket: "digicook-2ecbe.firebasestorage.app",
  messagingSenderId: "21145060975",
  appId: "1:21145060975:web:d4ada2a7adc5235c026f9a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
