import mongoose from "mongoose";
import QRCode from "qrcode";
import { generateSKU } from "../controllers/product.js";

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sku: { type: String, default: "" },

    category: {
      type: String,
      enum: ["sneakers", "boots", "heels", "sandals", "slippers", "shoes", "other"],
      default: "shoes"
    },

    gender: {
      type: String,
      enum: ["men", "women", "kids", "unisex"],
      default: "men",
    },

    season: {
      type: String,
      enum: ["summer", "winter", "spring", "autumn", "all"],
      default: "all",
    },

    material: { type: String, default: "Unknown" },
    price: { type: Number, required: true },

    types: [
      {
        color: { type: String, required: true },
        size: { type: String, required: true },
        style: { type: String, default: "classic" },
        images: [String],
        count: { type: Number, default: 0 },
      }
    ],

    description: { type: String, default: "empty" },
    mainImages: [String],

    isAvailable: { type: Boolean, default: true },
    sold: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);



// ✅ SKU AVTOMATIK YARATISH (MUAMMONING ASOSI SHU EDI)
ProductSchema.pre("save", function (next) {
  if (!this.sku || this.sku.trim() === "") {
    this.sku = generateSKU()
  }
  next();
});


// findOneAndUpdate — isAvailable uchun
ProductSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.types || (update.$set && update.$set.types)) {
    const types = update.types || update.$set.types;

    if (Array.isArray(types)) {
      const totalCount = types.reduce((sum, t) => sum + (t.count || 0), 0);
      if (!update.$set) update.$set = {};
      update.$set.isAvailable = totalCount > 0;
    }
  }

  next();
});


// ✅ QR CODE VIRTUAL — SKU mavjud bo‘lsa URL qaytaradi
ProductSchema.virtual("qrCode").get(function () {
  if (!this.sku) return null;

  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${this.sku}`;
});


export default mongoose.model("Product", ProductSchema);
