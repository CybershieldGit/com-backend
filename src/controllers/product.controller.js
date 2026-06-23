import Product from "../models/product.model.js";

export async function createProduct(req, res) {
    try {
        const {
            name,
            slug,
            short_description,
            description,
            image_url,
            status,
            featured,
            seo_title,
            seo_description,
        } = req.body;

        const existingProduct = await Product.findOne({ slug, user: req.user.id });

        if (existingProduct) {
            return res.status(409).json({
                success: false,
                message: "A product with this slug already exists",
            });
        }

        const product = await Product.create({
            name,
            slug,
            short_description,
            description,
            image_url,
            status,
            featured,
            seo_title,
            seo_description,
            user: req.user.id,
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map((e) => e.message).join(", "),
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create product",
        });
    }
}

export async function getProducts(req, res) {
    try {
        const {
            status,
            featured,
            search,
            page = 1,
            limit = 20,
        } = req.query;

        const filter = { user: req.user.id };

        if (status) filter.status = status;
        if (featured !== undefined) filter.featured = featured === "true";
        if (search) filter.name = { $regex: search, $options: "i" };

        const skip = (Number(page) - 1) * Number(limit);

        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Product.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch products",
        });
    }
}

export async function getProductById(req, res) {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        return res.status(200).json({
            success: true,
            product,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to fetch product",
        });
    }
}

export async function getProductBySlug(req, res) {
    try {
        const product = await Product.findOne({
            slug: req.params.slug.toLowerCase(),
            user: req.user.id,
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        return res.status(200).json({
            success: true,
            product,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch product",
        });
    }
}

export async function updateProduct(req, res) {
    try {
        const { slug, user, ...updates } = req.body;

        if (slug) {
            const duplicate = await Product.findOne({
                slug,
                user: req.user.id,
                _id: { $ne: req.params.id },
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "A product with this slug already exists",
                });
            }

            updates.slug = slug;
        }

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            updates,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map((e) => e.message).join(", "),
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update product",
        });
    }
}

export async function deleteProduct(req, res) {
    try {
        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to delete product",
        });
    }
}
