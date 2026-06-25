import mongoose from "mongoose";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import Wishlist from "../models/wishlist.model.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_QUANTITY_PER_ITEM = 100;

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/**
 * Extracts and validates the authenticated user's ID from the request.
 * Sends a 401 response and returns null if missing or invalid.
 */
function getAuthenticatedUserId(req, res) {
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
        return null;
    }

    return userId;
}

/**
 * Validates a product ID string. Sends a 400 response and returns false if invalid.
 */
function validateProductId(productId, res) {
    if (!productId) {
        res.status(400).json({
            success: false,
            message: "Product ID is required",
        });
        return false;
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        res.status(400).json({
            success: false,
            message: "Invalid product ID format",
        });
        return false;
    }

    return true;
}

/**
 * Validates quantity: must be a positive integer within the allowed cap.
 * Returns the parsed integer or null (after sending a 400 response).
 */
function validateQuantity(quantity, res, { allowZero = false } = {}) {
    const qtyNum = Number(quantity);

    if (isNaN(qtyNum) || !Number.isInteger(qtyNum)) {
        res.status(400).json({
            success: false,
            message: "Quantity must be a whole number",
        });
        return null;
    }

    const min = allowZero ? 0 : 1;
    if (qtyNum < min) {
        res.status(400).json({
            success: false,
            message: allowZero
                ? "Quantity must be 0 or a positive integer"
                : "Quantity must be at least 1",
        });
        return null;
    }

    if (qtyNum > MAX_QUANTITY_PER_ITEM) {
        res.status(400).json({
            success: false,
            message: `Quantity cannot exceed ${MAX_QUANTITY_PER_ITEM} per item`,
        });
        return null;
    }

    return qtyNum;
}

/**
 * Handles Mongoose CastError (invalid ObjectId). Returns true if handled.
 */
function handleCastError(res, error) {
    if (error.name === "CastError") {
        res.status(400).json({
            success: false,
            message: "Invalid ID format",
        });
        return true;
    }
    return false;
}

/**
 * Computes total item count and total price from a populated cart.
 */
function calculateCartTotals(cart) {
    let totalItems = 0;
    let totalPrice = 0;

    if (cart && cart.items) {
        cart.items.forEach((item) => {
            if (item.product && typeof item.product.price === "number") {
                totalItems += item.quantity;
                totalPrice += item.quantity * item.product.price;
            }
        });
    }

    return {
        totalItems,
        totalPrice: Number(totalPrice.toFixed(2)),
    };
}

/**
 * Formats the wishlist into a consistent response shape.
 */
function formatWishlistResponse(wishlist, userId) {
    return {
        id: wishlist._id,
        userId: userId.toString(),
        items: wishlist.items
            .filter((item) => item.product)
            .map((item) => ({ product: item.product })),
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt,
    };
}

// ─── Cart Controller Functions ────────────────────────────────────────────────

export async function getCart(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        let cart = await Cart.findOne({ user: userId }).populate("items.product");
        if (!cart) {
            cart = await Cart.create({ user: userId, items: [] });
        }

        return res.status(200).json({
            success: true,
            cart,
            totals: calculateCartTotals(cart),
        });
    } catch (error) {
        console.error("getCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch cart",
        });
    }
}

export async function addToCart(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { productId, quantity = 1 } = req.body || {};

        if (!validateProductId(productId, res)) return;

        const qtyNum = validateQuantity(quantity, res);
        if (qtyNum === null) return;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        if (product.status !== "published") {
            return res.status(400).json({
                success: false,
                message: "This product is not available for purchase",
            });
        }

        if (product.quantity === 0) {
            return res.status(400).json({
                success: false,
                message: "This product is out of stock",
            });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = await Cart.create({ user: userId, items: [] });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.product.toString() === productId
        );
        const currentQty = itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
        const targetQty = currentQty + qtyNum;

        if (targetQty > product.quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Only ${product.quantity} unit(s) available; you already have ${currentQty} in your cart.`,
            });
        }

        if (targetQty > MAX_QUANTITY_PER_ITEM) {
            return res.status(400).json({
                success: false,
                message: `Cannot exceed ${MAX_QUANTITY_PER_ITEM} units of the same item in your cart.`,
            });
        }

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = targetQty;
        } else {
            cart.items.push({ product: productId, quantity: qtyNum });
        }

        await cart.save();
        await cart.populate("items.product");

        return res.status(200).json({
            success: true,
            message: "Product added to cart successfully",
            cart,
            totals: calculateCartTotals(cart),
        });
    } catch (error) {
        if (handleCastError(res, error)) return;
        console.error("addToCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add product to cart",
        });
    }
}

export async function updateCartItem(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { productId } = req.params;
        if (!validateProductId(productId, res)) return;

        const { quantity } = req.body || {};
        if (quantity === undefined || quantity === null) {
            return res.status(400).json({
                success: false,
                message: "Quantity is required",
            });
        }

        // allowZero: true lets the caller set qty to 0 to remove the item
        const qtyNum = validateQuantity(quantity, res, { allowZero: true });
        if (qtyNum === null) return;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found",
            });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.product.toString() === productId
        );
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart",
            });
        }

        if (qtyNum > 0) {
            const product = await Product.findById(productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found",
                });
            }

            if (product.status !== "published") {
                return res.status(400).json({
                    success: false,
                    message: "This product is no longer available",
                });
            }

            if (qtyNum > product.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock. Only ${product.quantity} unit(s) available.`,
                });
            }

            if (qtyNum > MAX_QUANTITY_PER_ITEM) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot exceed ${MAX_QUANTITY_PER_ITEM} units of the same item in your cart.`,
                });
            }

            cart.items[itemIndex].quantity = qtyNum;
        } else {
            // quantity === 0 → remove the item
            cart.items.splice(itemIndex, 1);
        }

        await cart.save();
        await cart.populate("items.product");

        return res.status(200).json({
            success: true,
            message:
                qtyNum === 0
                    ? "Product removed from cart"
                    : "Cart item updated successfully",
            cart,
            totals: calculateCartTotals(cart),
        });
    } catch (error) {
        if (handleCastError(res, error)) return;
        console.error("updateCartItem error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update cart item",
        });
    }
}

export async function removeFromCart(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { productId } = req.params;
        if (!validateProductId(productId, res)) return;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found",
            });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.product.toString() === productId
        );
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart",
            });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();
        await cart.populate("items.product");

        return res.status(200).json({
            success: true,
            message: "Product removed from cart successfully",
            cart,
            totals: calculateCartTotals(cart),
        });
    } catch (error) {
        if (handleCastError(res, error)) return;
        console.error("removeFromCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to remove product from cart",
        });
    }
}

export async function clearCart(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = await Cart.create({ user: userId, items: [] });
        } else {
            cart.items = [];
            await cart.save();
        }

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
            cart,
            totals: calculateCartTotals(cart),
        });
    } catch (error) {
        console.error("clearCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to clear cart",
        });
    }
}

export async function moveCartItemToWishlist(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { productId } = req.params;
        if (!validateProductId(productId, res)) return;

        // Verify product exists and belongs to the authenticated user
        const product = await Product.findOne({ _id: productId, user: userId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or does not belong to you",
            });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found",
            });
        }

        // Confirm the item is actually in the cart
        const itemIndex = cart.items.findIndex(
            (item) => item.product.toString() === productId
        );
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart",
            });
        }

        // Remove item from cart
        cart.items.splice(itemIndex, 1);
        await cart.save();
        await cart.populate("items.product");

        // Get or create the user's wishlist
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: userId, items: [] });
        }

        // Add to wishlist only if not already present
        const alreadyInWishlist = wishlist.items.some(
            (item) => item.product.toString() === productId
        );

        let wishlistMessage = "Product is already in your wishlist";
        if (!alreadyInWishlist) {
            wishlist.items.push({ product: productId });
            await wishlist.save();
            wishlistMessage = "Product moved to wishlist successfully";
        }

        await wishlist.populate({
            path: "items.product",
            match: { user: userId },
            select: "name slug price image_url short_description description status quantity featured user",
        });

        return res.status(200).json({
            success: true,
            message: wishlistMessage,
            userId: userId.toString(),
            cart,
            cartTotals: calculateCartTotals(cart),
            wishlist: formatWishlistResponse(wishlist, userId),
            wishlistCount: wishlist.items.filter((item) => item.product).length,
        });
    } catch (error) {
        if (handleCastError(res, error)) return;
        console.error("moveCartItemToWishlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to move product to wishlist",
        });
    }
}

export async function moveAllCartItemsToWishlist(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const cart = await Cart.findOne({ user: userId });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty",
            });
        }

        // Get or create the user's wishlist
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: userId, items: [] });
        }

        const moved = [];
        const skipped = [];

        for (const item of cart.items) {
            const productId = item.product.toString();

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                skipped.push({ productId, reason: "Invalid product ID format" });
                continue;
            }

            // Verify product exists and belongs to the user
            const product = await Product.findOne({ _id: productId, user: userId });
            if (!product) {
                skipped.push({
                    productId,
                    reason: "Product not found or does not belong to you",
                });
                continue;
            }

            const alreadyInWishlist = wishlist.items.some(
                (wishlistItem) => wishlistItem.product.toString() === productId
            );

            if (alreadyInWishlist) {
                skipped.push({ productId, reason: "Already in wishlist" });
            } else {
                wishlist.items.push({ product: productId });
                moved.push(productId);
            }
        }

        // Clear the cart entirely
        cart.items = [];
        await cart.save();
        await cart.populate("items.product");

        // Save the updated wishlist
        await wishlist.save();
        await wishlist.populate({
            path: "items.product",
            match: { user: userId },
            select: "name slug price image_url short_description description status quantity featured user",
        });

        return res.status(200).json({
            success: true,
            message: "Cart items processed for wishlist",
            userId: userId.toString(),
            movedCount: moved.length,
            skippedCount: skipped.length,
            moved,
            skipped,
            cart,
            cartTotals: calculateCartTotals(cart),
            wishlist: formatWishlistResponse(wishlist, userId),
            wishlistCount: wishlist.items.filter((item) => item.product).length,
        });
    } catch (error) {
        console.error("moveAllCartItemsToWishlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to move cart items to wishlist",
        });
    }
}
