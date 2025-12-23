import Order from '../models/order.js'
import Product from '../models/product.js'
import Client from "../models/client.js"
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'
import { recordProductSale, revertProductSale } from './stats.js'

export const AllOrders = async (_, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('customer', 'firstName lastName')
      .populate('client', 'name phoneNumber')
      .populate('products.product', 'title mainImages price');

    const enrichedOrders = orders.map(order => {
      const enrichedProducts = order.products.map(item => {
        const product = item.product;
        const variant = product?.types?.[item.variantIndex] || {};

        return {
          ...item.toObject(),
          productName: product?.title || 'Deleted product',
          productImages: product?.mainImages || [],
          variantDetails: {
            color: variant.color || item.variant?.color,
            size: variant.size || item.variant?.size,
            style: variant.style || item.variant?.style,
            count: variant.count || 0
          }
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


const sendOrderNotification = async (order) => {
  try {
    const loggedUsers = await User.find({ isLoggedIn: true }).lean();
    if (!loggedUsers.length) return;
    if (!order.products || !order.products.length) return;

    // Product IDларни йиғиб, уларни базадан олиш
    const productIds = order.products.map(p => p.product);
    const productsMap = {};
    const productsFromDB = await Product.find({ _id: { $in: productIds } }).lean();
    productsFromDB.forEach(p => { productsMap[p._id.toString()] = p; });

    // Client ma'lumotini olish
    let clientInfo = null;
    if (order.client) {
      clientInfo = await Client.findById(order.client).lean();
    }

    for (const user of loggedUsers) {
      if (!user.telegramId) continue;

      // Header
      let message = `╔═══════════════════╗\n`;
      message += `  📝 ЯНГИ БУЮРТМА          \n`;
      message += `╚═══════════════════╝\n\n`;

      // Client haqida
      if (clientInfo) {
        message += `👤 Мижоз: <b>${clientInfo.name || "Noma'lum"}</b>\n`;
        if (clientInfo.phoneNumber) {
          message += `📞 Телефон: <b>${clientInfo.phoneNumber}</b>\n`;
        }
        message += `\n`;
      }

      // Mahsulotlar ro'yxati
      order.products.forEach((p, idx) => {
        const productData = productsMap[p.product.toString()];
        const title = productData?.title || "Noma'lum mahsulot";
        const priceCurrency = productData?.priceType === 'uz' ? 'сўм' : '$';

        message += `▫️ <b>${idx + 1}. ${title}</b>\n`;
        message += `   ├─ 📦 Миқдор: ${p.amount} ${p.unit || productData?.unit || ''}\n`;
        message += `   ├─ 🔢 Дона: ${p.count || 0}\n`;
        message += `   └─ 💰 Нархи: <b>Нарх белгиланмаган</b>\n\n`;
      });

      // Footer
      message += `📊 <i>Умумий маҳсулотлар: ${order.products.length} та</i>`;
      message += `\n🕒 ${new Date().toLocaleString('uz-UZ')}`;

      await bot.telegram.sendMessage(
        user.telegramId,
        message,
        {
          parse_mode: "HTML",
          disable_web_page_preview: true
        }
      );
    }

  } catch (err) {
    console.error("Bot хабар юборишда хатолик:", err.message);
  }
};


export const NewOrder = async (req, res) => {
  try {
    let { customer, client, clientId, products, status } = req.body;

    if (!customer) {
      return sendErrorResponse(res, 400, "Мижоз (customer) маълумоти йўқ!");
    }

    if (!products || !products.length) {
      return sendErrorResponse(res, 400, "Буюртмада маҳсулотлар йўқ!");
    }

    let clientToUse = null;

    // 🔹 Client yaratish yoki mavjud clientni ishlatish
    if (clientId) {
      // Mavjud client ID kelsa
      const existingClient = await Client.findById(clientId);
      if (!existingClient) {
        return sendErrorResponse(res, 404, "Берилган ID бўйича мижоз топилмади!");
      }
      clientToUse = clientId;
    } else if (client) {
      // Yangi client ma'lumotlari kelsa
      if (!client.phoneNumber || !client.name) {
        return sendErrorResponse(res, 400, "Янги мижоз учун телефон ва исм мажбурий!");
      }

      // Telefon raqami bilan mavjud clientni tekshirish
      const existingClientByPhone = await Client.findOne({
        phoneNumber: client.phoneNumber
      });

      if (existingClientByPhone) {
        // Mavjud client bor, o'shanini ishlatamiz
        clientToUse = existingClientByPhone._id;
      } else {
        // Yangi client yaratamiz
        const newClient = await Client.create({
          name: client.name,
          phoneNumber: client.phoneNumber
        });
        clientToUse = newClient._id;
      }
    }
    // 🔹 client ham, clientId ham bo'lmasa, clientToUse null bo'ladi

    // 🔹 Product va variantlarni tekshirish
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product) {
        return sendErrorResponse(res, 404, `"${item.product}" ID ли маҳсулот топилмади!`);
      }

      // 🔹 Variantni tekshirish (color, size, style)
      const variant = product.types.find(t =>
        t.color === item.variant.color &&
        t.size === item.variant.size &&
        t.style === item.variant.style
      );

      if (!variant) {
        return sendErrorResponse(res, 404,
          `"${product.title}" учун ${item.variant.color} рангли, ${item.variant.size} ўлчовли варинт топилмади!`);
      }

      // 🔹 Countni tekshirish
      if (variant.count < item.quantity) {
        return sendErrorResponse(res, 400,
          `"${product.title}" (${item.variant.color}/${item.variant.size}) учун етарли миқдор йўқ! Мавжуд: ${variant.count}, Соранаётган: ${item.quantity}`);
      }
    }

    // 🔹 Stock (count) larni kamaytirish va tarix yozish
    const updatedProducts = [];
    for (const item of products) {
      const product = await Product.findById(item.product);
      const variantIndex = product.types.findIndex(t =>
        t.color === item.variant.color &&
        t.size === item.variant.size &&
        t.style === item.variant.style
      );

      if (variantIndex !== -1) {
        // 🔹 Countni kamaytirish
        product.types[variantIndex].count -= item.quantity;

        // 🔹 Sold ni oshirish
        product.sold += item.quantity;

        await product.save();

        // 🔹 Tarixga yozish
        await recordProductSale(
          item.product,
          item.variant,
          item.quantity
        );

        // 🔹 Order uchun product ma'lumotlarini tayyorlash
        updatedProducts.push({
          product: item.product,
          variantIndex: variantIndex,
          variant: item.variant,
          quantity: item.quantity,
          price: item.price || product.price
        });
      }
    }

    // 🔹 Yangi buyurtma yaratish
    const newOrder = new Order({
      customer,
      client: clientToUse,  // 🔹 Yaratilgan yoki mavjud client ID
      products: updatedProducts,
      total: updatedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0),
      paid: false,
      status: status || "pending",
      orderDate: new Date()
    });

    await newOrder.save();

    // 🔹 Client ma'lumotlarini populate qilish
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('client', 'name phoneNumber')
      .populate('customer', 'firstName lastName')
      .populate('products.product', 'title mainImages price');

    return res.status(201).json({
      message: "Буюртма муваффақиятли яратилди ✅",
      data: populatedOrder
    });

  } catch (error) {
    console.error("❌ Буюртма яратишда хатолик:", error);
    sendErrorResponse(res, 500, "Сервер хатолиги!");
  }
};

export const CancelOrder = async (req, res) => {
  try {
    const { id } = req.params

    const order = await Order.findById(id)
    if (!order) {
      return sendErrorResponse(res, 404, "Буюртма топилмади!")
    }

    if (order.paid) {
      return sendErrorResponse(res, 400, "Тўлов қилинган буюртмани бекор қилиш мумкин эмас!")
    }

    // 🔹 Stock (count) larni qaytarish va tarixni tuzatish
    for (const item of order.products) {
      const product = await Product.findById(item.product);
      if (product && product.types[item.variantIndex]) {
        // 🔹 Countni qaytarish
        product.types[item.variantIndex].count += item.quantity;

        // 🔹 Sold ni kamaytirish
        product.sold = Math.max(0, product.sold - item.quantity);

        await product.save();

        // 🔹 Tarixni tuzatish
        await revertProductSale(
          item.product,
          item.variant,
          item.quantity
        );
      }
    }

    // 🔹 Status'ni cancelled qilish
    order.status = "cancelled";
    await order.save();

    return res.status(200).json({
      data: order,
      message: "Буюртма бекор қилинди ❌"
    })
  } catch (error) {
    console.error("❌ Буюртма бекор қилишда хатолик:", error)
    sendErrorResponse(res, 500, "Сервер хатолиги!")
  }
}



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


