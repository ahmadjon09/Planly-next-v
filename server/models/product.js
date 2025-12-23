import mongoose from "mongoose";
import { generateSKU } from "../middlewares/sku.js";

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sku: { type: String, default: "", unique: true },

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
        color: {
          type: String,
          required: [true, "Ранг киритилиши шарт"],
        },

        size: {
          type: String,
          required: [true, "Ўлчам киритилиши шарт"],
        },

        style: {
          type: String,
          default: "classic",
        },

        images: {
          type: [String],
          default: [],
        },

        count: {
          type: Number,
          default: 0,
          min: [0, "Сони манфий бўлиши мумкин эмас"],
        },

        model: {
          type: String,
          required: [true, "Модель номи мажбурий"],
        },
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
  if (this.isNew && (!this.sku || this.sku.trim() === "")) {
    this.sku = generateSKU();
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

ProductSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });

  if (obj.types && Array.isArray(obj.types)) {
    obj.types = obj.types.map(t => ({
      ...t,
      qrCode: t.model
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.model}`
        : null
    }));
  }

  return obj;
};

ProductSchema.virtual("qrCode").get(function () {
  if (!this.sku) return null;

  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${this.sku}`;
});


export default mongoose.model("Product", ProductSchema);
