import { Router } from "express";
import * as cartController from "../controllers/cart.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

/**
 * GET    /api/cart
 * POST   /api/cart/items
 * PUT    /api/cart/items/:productId
 * DELETE /api/cart/items/:productId
 * DELETE /api/cart
 */
router.get("/", cartController.getCart);
router.post("/items", cartController.addToCart);
router.put("/items/:productId", cartController.updateCartItem);
router.delete("/items/:productId", cartController.removeFromCart);
router.delete("/", cartController.clearCart);

export default router;
