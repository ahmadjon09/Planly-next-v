import Order from '../models/order.js'
import Product from '../models/product.js'
import Client from "../models/client.js"
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'
import mongoose from 'mongoose';

export const AllOrders = async (_, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('customer', 'firstName lastName')
      .populate('client', 'fullName phoneNumber')
      .populate('products.product', 'title mainImages price');

    const enrichedOrders = orders.map(order => {
      const enrichedProducts = order.products.map(item => {
        const product = item.product;

        return {
          ...item.toObject(),
          productName: product?.title || 'Deleted product',
          productImages: product?.mainImages || []
        };
      });

      return {
        ...order.toObject(),
        products: enrichedProducts
      };
    });

    return res.status(200).json({ data: enrichedOrders });
  } catch (error) {
    console.error('❌ Error in AllOrders:', error);
    sendErrorResponse(res, 500, 'Server Error');
  }
};

export const NewOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, client, clientId, products, status } = req.body;

    if (!customer) {
      return sendErrorResponse(res, 400, "Мижоз маълумоти йўқ!");
    }

    if (!Array.isArray(products) || products.length === 0) {
      return sendErrorResponse(res, 400, "Маҳсулот йўқ!");
    }

    /* ========== CLIENT ========== */
    let clientToUse = null;
    let noClient = false;

    if (clientId) {
      const existingClient = await Client.findById(clientId);
      if (!existingClient) {
        return sendErrorResponse(res, 404, "Мижоз топилмади!");
      }
      clientToUse = existingClient._id;
    } else if (client) {
      let found = await Client.findOne({ phoneNumber: client.phoneNumber });
      if (!found) {
        found = await Client.create(client);
      }
      clientToUse = found._id;
    } else {
      noClient = true;
    }

    /* ========== PRODUCTS ========== */
    const productIds = products.map(p => p.product);

    const dbProducts = await Product.find({
      _id: { $in: productIds }
    }).session(session);

    if (dbProducts.length !== products.length) {
      throw new Error("Айрим маҳсулотлар топилмади");
    }

    const productMap = new Map();
    dbProducts.forEach(p => productMap.set(String(p._id), p));

    const bulkOps = [];
    const updatedProducts = [];

    for (const item of products) {
      const product = productMap.get(String(item.product));

      const quantity = Number(item.quantity);
      const price = Number(item.price ?? product.price);

      if (product.count < quantity) {
        throw new Error(`"${product.title}" учун етарли миқдор йўқ`);
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $inc: {
              count: -quantity,
              sold: quantity // 🔥 SOLD OSHADI
            }
          }
        }
      });

      updatedProducts.push({
        product: product._id,
        quantity,
        price
      });
    }

    // 🔥 BITTA ZARBADA UPDATE
    await Product.bulkWrite(bulkOps, { session });

    const total = updatedProducts.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );

    const newOrder = await Order.create([{
      customer,
      client: clientToUse,
      noClient,
      products: updatedProducts,
      total,
      paid: false,
      status,
      orderDate: new Date()
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Буюртма яратилди ✅",
      data: newOrder[0]
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return sendErrorResponse(res, 500, err.message);
  }
};



export const CancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      return sendErrorResponse(res, 404, "Буюртма топилмади!");
    }

    const bulkOps = order.products.map(item => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: {
            count: item.quantity,
            sold: -item.quantity
          }
        }
      }
    }));

    await Product.bulkWrite(bulkOps, { session });
    await Order.findByIdAndDelete(order._id).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.json({
      message: "Буюртма бекор қилинди ❌"
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return sendErrorResponse(res, 500, "Сервер хатолиги");
  }
};



export const UpdateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { products, status, paid } = req.body;

    const order = await Order.findById(id);
    if (!order) return sendErrorResponse(res, 404, "Буюртма топилмади!");

    // 🔹 Faqat status va paid ni yangilash mumkin
    if (status) order.status = status;
    if (paid !== undefined) order.paid = paid;

    // 🔹 Products yangilash (agar kerak bo'lsa)
    if (products && products.length) {
      // 🔹 Oldingi products countlarini qaytarish
      for (const oldItem of order.products) {
        const product = await Product.findById(oldItem.product);
        if (product && product.types[oldItem.variantIndex]) {
          product.types[oldItem.variantIndex].count += oldItem.quantity;
          product.sold = Math.max(0, product.sold - oldItem.quantity);
          await product.save();
        }
      }

      // 🔹 Yangi products countlarini kamaytirish
      const updatedProducts = [];
      for (const item of products) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        const variantIndex = product.types.findIndex(t =>
          t.color === item.variant.color &&
          t.size === item.variant.size &&
          t.style === item.variant.style
        );

        if (variantIndex !== -1) {
          // 🔹 Count tekshirish
          if (product.types[variantIndex].count < item.quantity) {
            return sendErrorResponse(res, 400,
              `"${product.title}" учун етарли миқдор йўқ!`);
          }

          // 🔹 Countni kamaytirish
          product.types[variantIndex].count -= item.quantity;
          product.sold += item.quantity;
          await product.save();

          updatedProducts.push({
            product: item.product,
            variantIndex: variantIndex,
            variant: item.variant,
            quantity: item.quantity,
            price: item.price || product.price
          });
        }
      }

      order.products = updatedProducts;
      order.total = updatedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    }

    await order.save();

    return res.status(200).json({
      data: order,
      message: "Буюртма муваффақиятли янгиланди ✅"
    });

  } catch (error) {
    console.error("❌ Буюртма янгилашда хатолик:", error);
    sendErrorResponse(res, 500, "Сервер хатолиги!");
  }
};