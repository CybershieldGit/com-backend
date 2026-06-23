import { Router } from "express";
import * as productController from "../controllers/product.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

/**
 * GET    /api/products
 * POST   /api/products
 * GET    /api/products/slug/:slug
 * GET    /api/products/:id
 * PUT    /api/products/:id
 * DELETE /api/products/:id
 */

router.get("/", productController.getProducts);
router.post("/", productController.createProduct);
router.get("/slug/:slug", productController.getProductBySlug);
router.get("/:id", productController.getProductById);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

export default router;
