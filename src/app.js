import express from "express";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import productRouter from "./routes/product.routes.js";
import cartRouter from "./routes/cart.routes.js";
import wishlistRouter from "./routes/wishlist.routes.js";
import { globalLimiter } from "./middleware/rate-limiter.middleware.js";

const app = express();


app.use(globalLimiter);
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRouter);


export default app;