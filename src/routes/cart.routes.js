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
 * POST   /api/cart/items/:productId/move-to-wishlist
 * POST   /api/cart/move-all-to-wishlist
 * DELETE /api/cart
 */
router.get("/", cartController.getCart);
router.post("/items", cartController.addToCart);
router.post("/move-all-to-wishlist", cartController.moveAllCartItemsToWishlist);
router.put("/items/:productId", cartController.updateCartItem);
router.delete("/items/:productId", cartController.removeFromCart);
router.post("/items/:productId/move-to-wishlist", cartController.moveCartItemToWishlist);
router.delete("/", cartController.clearCart);

export default router;
