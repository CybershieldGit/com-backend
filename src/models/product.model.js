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
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ status: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
