import express from "express";

import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";

import { Category, db } from "../../config.js";

const routes = express.Router();

// READ - Get all categories
routes.get("/", async (req, res) => {
  try {
    const result = await getDocs(Category);

    const list = result.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    res.status(200).json({
      success: true,
      total: list.length,
      data: list
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      msg: "Failed to retrieve categories"
    });
  }
});

// CREATE - Add a category
routes.post("/create", async (req, res) => {
  try {
    const { name, description } = req.body ?? {};
    if (typeof name !== "string" || !name.trim() ||
        typeof description !== "string" || !description.trim()) {
      return res.status(400).json({
        success: false,
        msg: "Name and description are required"
      });
    }

    const category = {
      name: name.trim(),
      description: description.trim()
    };
    const newCategory = await addDoc(Category, category);

    console.log("New category added with ID:", newCategory.id);

    res.status(201).json({
      success: true,
      id: newCategory.id,
      msg: "Category added successfully",
      data: { id: newCategory.id, ...category }
    });
  } catch (error) {
    console.error("Failed to add category:", error);
    res.status(500).json({
      success: false,
      code: error?.code ?? "unknown",
      msg: "Failed to add category"
    });
  }
});

// DELETE - Delete a category
routes.delete("/delete/:category_id", async (req, res) => {
  try {
    const id = req.params.category_id;

    const categoryRef = doc(db, "categories", id);

    await deleteDoc(categoryRef);

    res.status(200).json({
      success: true,
      msg: "Category deleted successfully"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      msg: "Failed to delete category"
    });
  }
});

routes.put("/update/:category_id", async (req, res) => {
  try {
    const { category_id } = req.params;
    const { name, description } = req.body ?? {};
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No valid fields to update",
        receivedBody: req.body
      });
    }

    await updateDoc(doc(db, "categories", category_id), updates);

    return res.status(200).json({
      success: true,
      msg: "Category updated successfully"
    });
  } catch (error) {
    console.error("Update category failed:", error);
    return res.status(500).json({
      success: false,
      msg: error.message
    });
  }
});


export default routes;
