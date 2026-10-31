import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrw54EAmjUOfMxmFfAE-Ocz5ZUMjyRfu0",
  authDomain: "monitor-de-metricas-bi.firebaseapp.com",
  projectId: "monitor-de-metricas-bi",
  storageBucket: "monitor-de-metricas-bi.firebasestorage.app",
  messagingSenderId: "815805308566",
  appId: "1:815805308566:web:5173de36edde1ddc356cb7",
  measurementId: "G-7EG58FYBW6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const githubProvider = new GithubAuthProvider();
