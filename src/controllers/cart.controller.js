import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

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

export async function getCart(req, res) {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
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
            message: "Failed to fetch cart"
        });
    }
}

export async function addToCart(req, res) {
    try {
        const { productId, quantity = 1 } = req.body || {};
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required"
            });
        }

        const qtyNum = Number(quantity);
        if (isNaN(qtyNum) || qtyNum < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be at least 1"
            });
        }

        const product = await Product.findById(productId);
        if (!product || product.status !== "published") {
            return res.status(404).json({
                success: false,
                message: "Product not found or not available"
            });
        }

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        const currentQty = itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
        const targetQty = currentQty + qtyNum;

        if (targetQty > product.quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Only ${product.quantity} unit(s) available, and you already have ${currentQty} in your cart.`
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
            totals: calculateCartTotals(cart)
        });
    } catch (error) {
        console.error("addToCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add product to cart"
        });
    }
}

export async function updateCartItem(req, res) {
    try {
        const { productId } = req.params;
        const { quantity } = req.body || {};

        if (quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: "Quantity is required"
            });
        }

        const qtyNum = Number(quantity);
        if (isNaN(qtyNum) || qtyNum < 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be 0 or a positive number"
            });
        }

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart"
            });
        }

        const product = await Product.findById(productId);
        if (qtyNum > 0) {
            if (!product || product.status !== "published") {
                return res.status(404).json({
                    success: false,
                    message: "Product not found or not available"
                });
            }
            if (qtyNum > product.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock. Only ${product.quantity} unit(s) available.`
                });
            }
        }

        if (qtyNum === 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = qtyNum;
        }

        await cart.save();
        await cart.populate("items.product");

        return res.status(200).json({
            success: true,
            message: qtyNum === 0 ? "Product removed from cart" : "Cart item updated successfully",
            cart,
            totals: calculateCartTotals(cart)
        });
    } catch (error) {
        console.error("updateCartItem error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update cart item"
        });
    }
}

export async function removeFromCart(req, res) {
    try {
        const { productId } = req.params;

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart"
            });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();
        await cart.populate("items.product");

        return res.status(200).json({
            success: true,
            message: "Product removed from cart successfully",
            cart,
            totals: calculateCartTotals(cart)
        });
    } catch (error) {
        console.error("removeFromCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to remove product from cart"
        });
    }
}

export async function clearCart(req, res) {
    try {
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        } else {
            cart.items = [];
            await cart.save();
        }

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
            cart,
            totals: calculateCartTotals(cart)
        });
    } catch (error) {
        console.error("clearCart error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to clear cart"
        });
    }
}
