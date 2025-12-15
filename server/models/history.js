import mongoose from "mongoose";

const ProductSaleHistorySchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Types.ObjectId,
            ref: "Product",
            required: true
        },

        variant: {
            color: { type: String, default: "####" },
            size: { type: String, default: "####" },
            style: { type: String, default: "classic" }
        },

        soldCount: {
            type: Number,
            required: true
        },

        month: {
            type: String,
            required: true,
            match: /^\d{4}-(0[1-9]|1[0-2])$/
        }
    },
    { timestamps: true }
);

ProductSaleHistorySchema.index(
    { product: 1, "variant.color": 1, "variant.size": 1, "variant.style": 1, month: 1 },
    { unique: true }
);

export default mongoose.model("ProductSaleHistory", ProductSaleHistorySchema);
