import mongoose from 'mongoose'

const OrderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },

  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },

      variant: {
        color: { type: String, default: "####" },
        size: { type: String, default: "####" },
        style: { type: String, default: "classic" }
      },

      quantity: {
        type: Number,
        required: true,
        default: 1
      },

      price: {
        type: Number,
        required: true,
        default: 0
      }
    }
  ],

  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Clients",
    required: true
  },

  status: { type: String, required: true },
  paid: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  orderDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

export default mongoose.model('Order', OrderSchema)
