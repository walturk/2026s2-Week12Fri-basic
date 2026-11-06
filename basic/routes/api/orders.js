import express from "express";

import {
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "firebase/firestore";

import { Order, db } from "../../config.js";

const routes = express.Router();

const STATUSES = ["pending", "preparing", "ready", "completed", "cancelled"];

class ValidationError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Validate the items array: [{ dishId, quantity }]
function validateItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ValidationError("Order must contain at least one item");
    }

    // Merge duplicate dishes into a single line
    const quantities = new Map();

    for (const item of items) {
        const dishId = item?.dishId;
        const quantity = Number(item?.quantity ?? 1);

        if (typeof dishId !== "string" || !dishId.trim()) {
            throw new ValidationError("Invalid dish ID");
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new ValidationError("Invalid quantity");
        }

        const id = dishId.trim();
        quantities.set(id, (quantities.get(id) ?? 0) + quantity);
    }

    return quantities;
}

// Look up dishes and snapshot name/price so later menu changes
// do not alter existing orders
async function buildOrderLines(quantities) {
    const lines = await Promise.all(
        [...quantities].map(async ([dishId, quantity]) => {
            const snap = await getDoc(doc(db, "dishes", dishId));

            if (!snap.exists()) {
                throw new ValidationError(
                    `Dish not found: ${dishId}`, 404
                );
            }

            const { name, price } = snap.data();

            return {
                dishId,
                name,
                price,
                quantity,
                subtotal: Math.round(price * quantity * 100) / 100
            };
        })
    );

    const total = Math.round(
        lines.reduce((sum, line) => sum + line.subtotal, 0) * 100
    ) / 100;

    return { items: lines, total };
}

function validateStatus(status) {
    if (!STATUSES.includes(status)) {
        throw new ValidationError(
            `Invalid status. Allowed: ${STATUSES.join(", ")}`
        );
    }

    return status;
}

function validateOptionalText(value, label) {
    if (value === undefined) return undefined;

    if (typeof value !== "string") {
        throw new ValidationError(`Invalid ${label}`);
    }

    return value.trim();
}

function handleError(res, error, action) {
    if (error instanceof ValidationError) {
        return res.status(error.status).json({
            success: false,
            msg: error.message
        });
    }

    console.error(`${action} error:`, error);

    res.status(500).json({
        success: false,
        msg: `Failed to ${action}`
    });
}

// ==========================================
// GET - Retrieve all orders (optional ?status=)
// ==========================================

routes.get("/", async (req, res) => {
    try {
        const { status } = req.query;

        if (status !== undefined) {
            validateStatus(status);
        }

        const result = await getDocs(Order);

        let list = result.docs.map(d => ({
            ...d.data(),
            id: d.id
        }));

        if (status !== undefined) {
            list = list.filter(order => order.status === status);
        }

        res.status(200).json({
            success: true,
            total: list.length,
            data: list
        });

    } catch (error) {
        handleError(res, error, "retrieve orders");
    }
});

// ==========================================
// GET - Retrieve a single order
// ==========================================

routes.get("/:order_id", async (req, res) => {
    try {
        const snap = await getDoc(doc(db, "orders", req.params.order_id));

        if (!snap.exists()) {
            throw new ValidationError("Order not found", 404);
        }

        res.status(200).json({
            success: true,
            data: { ...snap.data(), id: snap.id }
        });

    } catch (error) {
        handleError(res, error, "retrieve order");
    }
});

// ==========================================
// POST - Place a new order
// body: { items: [{ dishId, quantity }], customerName?, notes? }
// ==========================================

routes.post("/create", async (req, res) => {
    try {
        const { items, customerName, notes } = req.body ?? {};

        const quantities = validateItems(items);
        const order = await buildOrderLines(quantities);

        const payload = {
            ...order,
            customerName: validateOptionalText(customerName, "customer name") ?? "",
            notes: validateOptionalText(notes, "notes") ?? "",
            status: "pending",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const result = await addDoc(Order, payload);

        res.status(201).json({
            success: true,
            id: result.id,
            total: order.total,
            msg: "Order placed successfully"
        });

    } catch (error) {
        handleError(res, error, "place order");
    }
});

// ==========================================
// PUT - Update an order
// body: { status?, items?, customerName?, notes? }
// Items can only be changed while the order is still pending
// ==========================================

routes.put("/update/:order_id", async (req, res) => {
    try {
        const { status, items, customerName, notes } = req.body ?? {};

        const orderRef = doc(db, "orders", req.params.order_id);
        const snap = await getDoc(orderRef);

        if (!snap.exists()) {
            throw new ValidationError("Order not found", 404);
        }

        const updates = {};

        if (status !== undefined) {
            updates.status = validateStatus(status);
        }

        const name = validateOptionalText(customerName, "customer name");
        if (name !== undefined) updates.customerName = name;

        const note = validateOptionalText(notes, "notes");
        if (note !== undefined) updates.notes = note;

        if (items !== undefined) {
            if (snap.data().status !== "pending") {
                throw new ValidationError(
                    "Items can only be changed while the order is pending",
                    409
                );
            }

            Object.assign(
                updates,
                await buildOrderLines(validateItems(items))
            );
        }

        if (Object.keys(updates).length === 0) {
            throw new ValidationError("No valid fields to update");
        }

        updates.updatedAt = serverTimestamp();

        await updateDoc(orderRef, updates);

        res.status(200).json({
            success: true,
            msg: "Order updated successfully"
        });

    } catch (error) {
        handleError(res, error, "update order");
    }
});

// ==========================================
// DELETE - Delete an order
// ==========================================

routes.delete("/delete/:order_id", async (req, res) => {
    try {
        const orderRef = doc(db, "orders", req.params.order_id);
        const snap = await getDoc(orderRef);

        if (!snap.exists()) {
            throw new ValidationError("Order not found", 404);
        }

        await deleteDoc(orderRef);

        res.status(200).json({
            success: true,
            msg: "Order deleted successfully"
        });

    } catch (error) {
        handleError(res, error, "delete order");
    }
});

export default routes;
