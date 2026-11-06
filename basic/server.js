import express from "express";
import cors from "cors";

import category_routes from "./routes/api/categories.js";
import user_routes from "./routes/api/users.js";
import dish_routes from "./routes/api/dishes.js";
import order_routes from "./routes/api/orders.js";
import auth_routes from "./routes/api/auth.js";

const PORT = process.env.PORT || 5001;
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

//map endpoint Localhost:5000/api/category to category_routes
app.use("/api/category", category_routes);

//map endpoint Localhost:5000/api/user to user_routes
app.use("/api/user", user_routes);
app.use("/api/auth", auth_routes);
app.use("/api/dish", dish_routes);

app.use("/api/order", order_routes);

// app.use("/api/auth", auth_routes);

app.use("/static", express.static("images"));
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});