import { Router } from "express";
import * as wishlistController from "../controllers/wishlist.controller.js";
import { requireBearerToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireBearerToken);

/**
 * GET    /api/wishlist
 * GET    /api/wishlist/count
 * GET    /api/wishlist/status/:productId
 * POST   /api/wishlist/items
 * DELETE /api/wishlist/items/:productId
 * POST   /api/wishlist/items/:productId/move-to-cart
 * POST   /api/wishlist/move-all-to-cart
 * DELETE /api/wishlist
 */
router.get("/count", wishlistController.getWishlistCount);
router.get("/status/:productId", wishlistController.checkWishlistStatus);
router.post("/move-all-to-cart", wishlistController.moveAllWishlistItemsToCart);
router.get("/", wishlistController.getWishlist);
router.post("/items", wishlistController.addToWishlist);
router.post("/items/:productId/move-to-cart", wishlistController.moveWishlistItemToCart);
router.delete("/items/:productId", wishlistController.removeFromWishlist);
router.delete("/", wishlistController.clearWishlist);

export default router;
