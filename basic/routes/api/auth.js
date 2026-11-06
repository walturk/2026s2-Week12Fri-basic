import express from "express";
import bcrypt from "bcrypt";

import { User } from "../../config.js";

import {
  getDocs,
  addDoc,
  query,
  where,
  limit,
  serverTimestamp
} from "firebase/firestore";

const routes = express.Router();

// ======================================================
// POST - Login an existing user
// ======================================================

routes.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    // 1. Input validation
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        msg: "Email and password are required"
      });
    }

    // 2. Normalise email
    const normalisedEmail = email.trim().toLowerCase();

    // 3. Query Firestore for the user
    const userQuery = query(
      User,
      where("email", "==", normalisedEmail),
      limit(1)
    );

    const result = await getDocs(userQuery);

    // 4. Check if user exists
    if (result.empty) {
      return res.status(401).json({
        success: false,
        msg: "Invalid email or password"
      });
    }

    // 5. Get the first matching user document
    const userDoc = result.docs[0];

    const existingUser = {
      ...userDoc.data(),
      id: userDoc.id
    };

    // 6. Verify password using bcrypt
    const isMatch = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        msg: "Invalid email or password"
      });
    }

    // 7. Login successful
    // Never return the password hash
    res.status(200).json({
      success: true,
      data: {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: existingUser.role
      },
      msg: "User logged in successfully"
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      msg: "Login failed"
    });
  }
});

export default routes;