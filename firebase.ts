import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTwhnKS9-nrlCwyKyKWUwBiPw_SCo61Io",
  authDomain: "chatspeak-aff57.firebaseapp.com",
  projectId: "chatspeak-aff57",
  storageBucket: "chatspeak-aff57.firebasestorage.app",
  messagingSenderId: "219749658556",
  appId: "1:219749658556:web:621bf28f2603a8fa8c85b9"
};

// Initialize Firebase
const app = getApps().length ?getApp(): initializeApp(firebaseConfig);

const db = getFirestore(app);
export { db };