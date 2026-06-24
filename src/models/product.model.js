import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            maxlength: 255,
        },
        slug: {
            type: String,
            required: [true, "Product slug is required"],
            trim: true,
            lowercase: true,
            maxlength: 255,
        },
        short_description: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
        },
        image_url: {
            type: String,
            trim: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
        },
        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft",
        },
        featured: {
            type: Boolean,
            default: false,
        },
        seo_title: {
            type: String,
            trim: true,
            maxlength: 255,
        },
        seo_description: {
            type: String,
            trim: true,
        },
        price: {
            type: Number,
            required: [true, "Product price is required"],
            min: [0.01, "Product price must be greater than zero"],
        },
        quantity: {
            type: Number,
            required: [true, "Product quantity is required"],
            min: [1, "Product quantity must be at least 1"],
            validate: {
                validator: Number.isInteger,
                message: "Product quantity must be an integer",
            },
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

productSchema.index({ user: 1, slug: 1 }, { unique: true });
productSchema.index({ user: 1, status: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
