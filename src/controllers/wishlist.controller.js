import mongoose from "mongoose";
import Wishlist from "../models/wishlist.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

const PRODUCT_FIELDS = "name slug price image_url short_description description status quantity featured user";

function getProductPopulate(userId) {
    return {
        path: "items.product",
        match: { user: userId },
        select: PRODUCT_FIELDS,
    };
}

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

function wishlistBelongsToUser(wishlist, userId) {
    return Boolean(wishlist && wishlist.user.toString() === userId.toString());
}

function denyIfNotOwner(wishlist, userId, res) {
    if (!wishlistBelongsToUser(wishlist, userId)) {
        res.status(403).json({
            success: false,
            message: "You do not have access to this wishlist",
        });
        return true;
    }

    return false;
}

function formatWishlistResponse(wishlist, userId) {
    const ownerId = userId.toString();

    return {
        id: wishlist._id,
        userId: ownerId,
        items: (wishlist.items || [])
            .filter(
                (item) =>
                    item.product &&
                    item.product.user?.toString() === ownerId
            )
            .map((item) => ({ product: item.product })),
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt,
    };
}

async function populateWishlist(wishlist, userId) {
    await wishlist.populate(getProductPopulate(userId));
    wishlist.items = wishlist.items.filter((item) => item.product);
    return wishlist;
}

async function findWishlistForUser(userId) {
    return Wishlist.findOne({ user: userId });
}

async function getOrCreateWishlist(userId) {
    let wishlist = await findWishlistForUser(userId);

    if (!wishlist) {
        wishlist = await Wishlist.create({ user: userId, items: [] });
    }

    if (!wishlistBelongsToUser(wishlist, userId)) {
        throw new Error("Wishlist ownership mismatch");
    }

    return wishlist;
}

async function getOrCreateCart(userId) {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
        cart = await Cart.create({ user: userId, items: [] });
    }
    return cart;
}

async function findUserProduct(productId, userId) {
    return Product.findOne({ _id: productId, user: userId });
}

async function findUserPublishedProduct(productId, userId) {
    return Product.findOne({
        _id: productId,
        user: userId,
        status: "published",
    });
}

async function addProductToCart(userId, productId, quantity = 1) {
    const product = await findUserPublishedProduct(productId, userId);
    if (!product) {
        return {
            success: false,
            message: "Product not found, not published, or does not belong to you",
        };
    }

    const cart = await getOrCreateCart(userId);
    const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
    );
    const currentQty = itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
    const targetQty = currentQty + quantity;

    if (targetQty > product.quantity) {
        return {
            success: false,
            message: `Insufficient stock. Only ${product.quantity} unit(s) available.`,
        };
    }

    if (itemIndex > -1) {
        cart.items[itemIndex].quantity = targetQty;
    } else {
        cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    return { success: true, cart };
}

function handleCastError(res, error) {
    if (error.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID",
        });
    }
    return null;
}

export async function addToWishlist(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { productId } = req.body || {};

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        const product = await findUserProduct(productId, userId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or does not belong to you",
            });
        }

        const wishlist = await getOrCreateWishlist(userId);
        const alreadyExists = wishlist.items.some(
            (item) => item.product.toString() === productId
        );

        if (alreadyExists) {
            return res.status(409).json({
                success: false,
                message: "Product is already in your wishlist",
            });
        }

        wishlist.items.push({ product: productId });
        await wishlist.save();
        await populateWishlist(wishlist, userId);

        return res.status(201).json({
            success: true,
            message: "Product added to wishlist successfully",
            userId: userId.toString(),
            wishlist: formatWishlistResponse(wishlist, userId),
            count: wishlist.items.length,
        });
    } catch (error) {
        const castResponse = handleCastError(res, error);
        if (castResponse) return castResponse;

        console.error("addToWishlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add product to wishlist",
        });
    }
}

export async function getWishlist(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const wishlist = await getOrCreateWishlist(userId);
        if (denyIfNotOwner(wishlist, userId, res)) return;

        await populateWishlist(wishlist, userId);

        return res.status(200).json({
            success: true,
            userId: userId.toString(),
            wishlist: formatWishlistResponse(wishlist, userId),
            count: wishlist.items.length,
        });
    } catch (error) {
        console.error("getWishlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch wishlist",
        });
    }
}

export async function removeFromWishlist(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { productId } = req.params;
        const product = await findUserProduct(productId, userId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or does not belong to you",
            });
        }

        const wishlist = await findWishlistForUser(userId);

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found",
            });
        }

        if (denyIfNotOwner(wishlist, userId, res)) return;

        const itemIndex = wishlist.items.findIndex(
            (item) => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in wishlist",
            });
        }

        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();
        await populateWishlist(wishlist, userId);

        return res.status(200).json({
            success: true,
            message: "Product removed from wishlist successfully",
            userId: userId.toString(),
            wishlist: formatWishlistResponse(wishlist, userId),
            count: wishlist.items.length,
        });
    } catch (error) {
        const castResponse = handleCastError(res, error);
        if (castResponse) return castResponse;

        console.error("removeFromWishlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to remove product from wishlist",
        });
    }
}

export async function checkWishlistStatus(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { productId } = req.params;
        const product = await findUserProduct(productId, userId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or does not belong to you",
            });
        }

        const wishlist = await findWishlistForUser(userId);

        const inWishlist = wishlist
            ? wishlist.items.some((item) => item.product.toString() === productId)
            : false;

        return res.status(200).json({
            success: true,
            userId: userId.toString(),
            productId,
            inWishlist,
        });
    } catch (error) {
        const castResponse = handleCastError(res, error);
        if (castResponse) return castResponse;

        console.error("checkWishlistStatus error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to check wishlist status",
        });
    }
}

export async function getWishlistCount(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const wishlist = await findWishlistForUser(userId);

        return res.status(200).json({
            success: true,
            userId: userId.toString(),
            count: wishlist ? wishlist.items.length : 0,
        });
    } catch (error) {
        console.error("getWishlistCount error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch wishlist count",
        });
    }
}

export async function clearWishlist(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const wishlist = await getOrCreateWishlist(userId);
        if (denyIfNotOwner(wishlist, userId, res)) return;

        wishlist.items = [];
        await wishlist.save();

        return res.status(200).json({
            success: true,
            message: "Wishlist cleared successfully",
            userId: userId.toString(),
            wishlist: formatWishlistResponse(wishlist, userId),
            count: 0,
        });
    } catch (error) {
        console.error("clearWishlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to clear wishlist",
        });
    }
}

export async function moveWishlistItemToCart(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { productId } = req.params;
        const quantity = Number(req.body?.quantity ?? 1);

        if (isNaN(quantity) || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be at least 1",
            });
        }

        const product = await findUserProduct(productId, userId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or does not belong to you",
            });
        }

        const wishlist = await findWishlistForUser(userId);
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found",
            });
        }

        if (denyIfNotOwner(wishlist, userId, res)) return;

        const itemIndex = wishlist.items.findIndex(
            (item) => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in wishlist",
            });
        }

        const cartResult = await addProductToCart(userId, productId, quantity);
        if (!cartResult.success) {
            return res.status(400).json({
                success: false,
                message: cartResult.message,
            });
        }

        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();
        await populateWishlist(wishlist, userId);
        await cartResult.cart.populate("items.product");

        return res.status(200).json({
            success: true,
            message: "Product moved to cart successfully",
            userId: userId.toString(),
            wishlist: formatWishlistResponse(wishlist, userId),
            cart: cartResult.cart,
            count: wishlist.items.length,
        });
    } catch (error) {
        const castResponse = handleCastError(res, error);
        if (castResponse) return castResponse;

        console.error("moveWishlistItemToCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to move product to cart",
        });
    }
}

export async function moveAllWishlistItemsToCart(req, res) {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const wishlist = await findWishlistForUser(userId);

        if (!wishlist || wishlist.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Wishlist is empty",
            });
        }

        if (denyIfNotOwner(wishlist, userId, res)) return;

        const moved = [];
        const failed = [];

        for (const item of [...wishlist.items]) {
            const productId = item.product.toString();
            const cartResult = await addProductToCart(userId, productId, 1);

            if (cartResult.success) {
                wishlist.items = wishlist.items.filter(
                    (wishlistItem) => wishlistItem.product.toString() !== productId
                );
                moved.push(productId);
            } else {
                failed.push({ productId, reason: cartResult.message });
            }
        }

        await wishlist.save();
        await populateWishlist(wishlist, userId);

        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        return res.status(200).json({
            success: true,
            message: "Wishlist items processed for cart",
            userId: userId.toString(),
            movedCount: moved.length,
            failedCount: failed.length,
            moved,
            failed,
            wishlist: formatWishlistResponse(wishlist, userId),
            cart,
            count: wishlist.items.length,
        });
    } catch (error) {
        console.error("moveAllWishlistItemsToCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to move wishlist items to cart",
        });
    }
}
