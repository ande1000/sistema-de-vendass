// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4jQS3ZqfR8vIbYkeH7zx--3T4qDVeOSc",
  authDomain: "sisme-36c0e.firebaseapp.com",
  projectId: "sisme-36c0e",
  storageBucket: "sisme-36c0e.firebasestorage.app",
  messagingSenderId: "513353599801",
  appId: "1:513353599801:web:5c5075200089f0282f76e8",
  measurementId: "G-B2QNC22DV1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
