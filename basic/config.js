import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";

//replace the following with your firebase configuration 
// from your firebase console

const firebaseConfig = {
  apiKey: "AIzaSyAUcsy5xHdHf_qXWdKUbmuo6_5i-NXiQRo",
  authDomain: "foodapp-e4a5a.firebaseapp.com",
  projectId: "foodapp-e4a5a",
  storageBucket: "foodapp-e4a5a.firebasestorage.app",
  messagingSenderId: "1082525555042",
  appId: "1:1082525555042:web:0c7415bc35ac7484cbf43b",
  measurementId: "G-5HCB0WSCT4"
};

const firebase= initializeApp(firebaseConfig);
const db = getFirestore(firebase);

const Category = collection(db,"categories");
const User = collection(db,"users");
const Dish = collection(db,"dishes");
const Order = collection(db,"orders");

export {db, Category, Dish, Order, User};

//do not forget all the  rest of collections such as orders
//import { initializeApp } from "firebase/app";
//import { getFirestore, collection } from "firebase/firestore";
