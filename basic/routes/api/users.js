import express from "express";
import bcrypt from "bcrypt";

import {
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    query,
    where,
    serverTimestamp
} from "firebase/firestore";

import { db, User } from "../../config.js";

const routes = express.Router();

// ============================================
// GET - Retrieve all users
// ============================================
routes.get("/", async (req, res) => {
    try {
        const result = await getDocs(User);

        const list = result.docs.map(doc => {
            const { password, ...safeData } = doc.data();

            return {
                ...safeData,
                id: doc.id
            };
        });

        res.status(200).json({
            success: true,
            total: list.length,
            data: list
        });

    } catch (error) {
        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            msg: "Failed to retrieve users"
        });
    }
});

// ============================================
// POST - Create a new user
// ============================================
routes.post("/create", async (req, res) => {
    try {
        const {
            email,
            password,
            firstName,
            lastName
        } = req.body ?? {};

        // Validate email and password
        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                msg: "Valid email and password are required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                msg: "Invalid email address"
            });
        }

        // Validate password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                msg: "Password must be at least 8 characters"
            });
        }

        // Validate optional name fields
        if (
            (firstName !== undefined &&
                typeof firstName !== "string") ||
            (lastName !== undefined &&
                typeof lastName !== "string")
        ) {
            return res.status(400).json({
                success: false,
                msg: "First name and last name must be strings"
            });
        }

        const normalisedEmail = email.trim().toLowerCase();

        // Check whether email already exists
        const emailQuery = query(
            User,
            where("email", "==", normalisedEmail)
        );

        const existingUsers = await getDocs(emailQuery);

        if (!existingUsers.empty) {
            return res.status(409).json({
                success: false,
                msg: "Email already registered"
            });
        }

        // Hash password using bcrypt
        const hashedPwd = await bcrypt.hash(password, 10);

        // Create new user
        const result = await addDoc(User, {
            email: normalisedEmail,
            password: hashedPwd,
            firstName: firstName?.trim() ?? "",
            lastName: lastName?.trim() ?? "",
            role: "staff",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        res.status(201).json({
            success: true,
            id: result.id,
            msg: "User added successfully"
        });

    } catch (error) {
        console.error("Create user error:", error);

        res.status(500).json({
            success: false,
            msg: "Failed to create user"
        });
    }
});

// ============================================
// PUT - Update an existing user
// ============================================
routes.put("/update/:user_id", async (req, res) => {
    try {
        const id = req.params.user_id;

        const {
            firstName,
            lastName,
            password
        } = req.body ?? {};

        const updates = {};

        // Validate first name
        if (firstName !== undefined) {
            if (typeof firstName !== "string") {
                return res.status(400).json({
                    success: false,
                    msg: "Invalid first name"
                });
            }

            updates.firstName = firstName.trim();
        }

        // Validate last name
        if (lastName !== undefined) {
            if (typeof lastName !== "string") {
                return res.status(400).json({
                    success: false,
                    msg: "Invalid last name"
                });
            }

            updates.lastName = lastName.trim();
        }

        // Hash password if being updated
        if (password !== undefined) {
            if (
                typeof password !== "string" ||
                password.length < 8
            ) {
                return res.status(400).json({
                    success: false,
                    msg: "Password must be at least 8 characters"
                });
            }

            updates.password = await bcrypt.hash(password, 10);
        }

        // Check that something is being updated
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                msg: "No valid fields to update"
            });
        }

        const userRef = doc(db, "users", id);

        // Check whether user exists
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        // Update timestamp
        updates.updatedAt = serverTimestamp();

        await updateDoc(userRef, updates);

        res.status(200).json({
            success: true,
            msg: "User updated successfully"
        });

    } catch (error) {
        console.error("Update user error:", error);

        res.status(500).json({
            success: false,
            msg: "Failed to update user"
        });
    }
});

// ============================================
// DELETE - Delete an existing user
// ============================================
routes.delete("/delete/:user_id", async (req, res) => {
    try {
        const id = req.params.user_id;
        const userRef = doc(db, "users", id);

        // Check whether user exists
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        await deleteDoc(userRef);

        res.status(200).json({
            success: true,
            msg: "User deleted successfully"
        });

    } catch (error) {
        console.error("Delete user error:", error);

        res.status(500).json({
            success: false,
            msg: "Failed to delete user"
        });
    }
});

export default routes;