import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB5oLInpySfMrT487yCKAhe8E9yA1xw0MQ",
  authDomain: "legalview-35af8.firebaseapp.com",
  projectId: "legalview-35af8",
  storageBucket: "legalview-35af8.firebasestorage.app",
  messagingSenderId: "585655059637",
  appId: "1:585655059637:web:07c92f1e7027db00d2eafc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged };
