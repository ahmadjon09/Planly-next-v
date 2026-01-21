import Product from '../models/product.js'
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'
import Users from "../models/user.js"
import { bot } from '../bot.js';

const sendBotNotification = async (products) => {
  try {
    const loggedUsers = await Users.find({ isLoggedIn: true }).lean();

    if (!loggedUsers.length) return;
    if (!products.length) return;

    for (const user of loggedUsers) {
      if (!user.telegramId) continue;

      // Header qismi
      let message = `  📦 ЯНГИ МАҲСУЛОТЛАР   \n\n`;


      // Mahsulotlar ro'yxati
      products.forEach((product, index) => {
        message += `▫️ <b>${index + 1}. ${product.title}</b>\n`;
        message += `   ├─ 📦 Миқдор: ${product.count} Дона\n`;
        // message += `   ├─ 🔢 Дона: ${product.count || 0}\n`;
      });

      // Footer qismi
      message += `\n🕒 ${new Date().toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent'
      })
        }`;

      await bot.telegram.sendMessage(
        user.telegramId,
        message,
        {
          parse_mode: "HTML",
          disable_web_page_preview: true
        }
      );
    }
    console.log("Sent");

  } catch (err) {
    console.error("Bot хабар юборишда хатолик:", err.message);
  }
};

const sendBotNotificationV2 = async (products) => {
  try {
    const loggedUsers = await Users.find({ isLoggedIn: true }).lean();
    if (!loggedUsers.length || !products.length) return;

    for (const user of loggedUsers) {
      if (!user.telegramId) continue;

      let message = `📦 <b>МАҲСУЛОТ ЯНГИЛАНДИ</b>\n\n`;

      products.forEach((product, index) => {
        message += `▫️ <b>${index + 1}. ${product.title}</b>\n`;

        if (product.addedCount) {
          message += `   ├─ ➕ Қўшилди: ${product.addedCount} дона\n`;
        }

        message += `   ├─ 📦 Жами: ${product.totalCount} дона\n\n`;
      });

      message += `🕒 ${new Date().toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent'
      })}`;

      await bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: "HTML",
        disable_web_page_preview: true
      });
    }

    console.log("Bot хабар юборилди ✅");
  } catch (err) {
    console.error("Bot хабар юборишда хатолик:", err.message);
  }
};

const sendBotNotificationV3 = async (products) => {
  try {
    const loggedUsers = await Users.find({
      isLoggedIn: true,
      telegramId: { $exists: true, $ne: null }
    }).lean();

    if (!loggedUsers.length || !products?.length) return;

    const time = new Date().toLocaleString("uz-UZ", {
      timeZone: "Asia/Tashkent"
    });

    for (const user of loggedUsers) {
      let message = `📦 <b>ЯНГИ / ЯНГИЛАНГАН МАҲСУЛОТЛАР</b>\n`;
      message += `━━━━━━━━━━━━━━━\n\n`;

      products.forEach((product, index) => {
        message += `▫️ <b>${index + 1}. ${product.title}</b>\n`;
        message += `   ├─ 🆔 АРТ: <code>${product.sku || "—"}</code>\n`;
        message += `   ├─ 📂 Категория: ${product.category || "—"}\n`;
        message += `   ├─ 📦 Қолдиқ: ${product.count ?? 0} дона\n`;
        message += `   ├─ 🔥 Сотилган: ${product.sold ?? 0} дона\n`;
        message += `   ├─ ✅ Мавжуд: ${product.isAvailable ? "Ҳа" : "Йўқ"}\n`;

        if (product.material) {
          message += `   ├─ 🧵 Материал: ${product.material}\n`;
        }

        if (product.mainImages?.length) {
          message += `   ├─ 🖼 Расм: ${product.mainImages[0]}\n`;
        }

        if (product.qrCode) {
          message += `   └─ 🔳 QR: ${product.qrCode}\n`;
        }

        message += `\n`;
      });

      message += `━━━━━━━━━━━━━━━\n`;
      message += `🕒 ${time}`;

      await bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: "HTML",
        disable_web_page_preview: false
      });
    }

    console.log("✅ Bot хабарлари муваффақиятли юборилди");
  } catch (err) {
    console.error("❌ Bot хабар юборишда хатолик:", err.message);
  }
};


export const CreateNewProduct = async (req, res) => {
  try {
    const data = req.body;

    if (!data.sku) {
      return res.status(400).json({
        message: "SKU мажбурий",
      });
    }

    const incomingCount = Number(data.count) || 0;

    /* =======================
       1️⃣ SKU bo‘yicha qidirish
    ======================= */
    const existingProduct = await Product.findOne({ sku: data.sku });

    /* =======================
       2️⃣ Agar product mavjud bo‘lsa
    ======================= */
    if (existingProduct) {
      existingProduct.count =
        (existingProduct.count || 0) + incomingCount;

      await existingProduct.save();

      sendBotNotificationV2([{
        title: existingProduct.title,
        addedCount: incomingCount,
        totalCount: existingProduct.count
      }]);
      return res.status(200).json({
        message: "Маҳсулот миқдори янгиланди ✅",
        product: existingProduct,
        updated: true
      });
    }

    /* =======================
       3️⃣ Aks holda yangi product
    ======================= */
    const newProduct = await Product.create({
      title: data.title,
      sku: data.sku,
      category: data.category,
      gender: data.gender,
      season: data.season,
      material: data.material,
      mainImages: data.mainImages || [],
      description: data.description || "",
      count: incomingCount
    });
    sendBotNotificationV3([newProduct]);
    return res.status(201).json({
      message: "Маҳсулот муваффақиятли яратилди ✅",
      product: newProduct,
      created: true
    });

  } catch (error) {
    console.error("CreateNewProduct error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Бу SKU аллақачон мавжуд!",
      });
    }

    return res.status(500).json({
      message: "Серверда хатолик юз берди!",
    });
  }
};





export const GetAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      searchField = '',
      category = '',
      date = ''
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    if (category) {
      query.category = category;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (search) {
      const safeSearch = search.trim();
      if (searchField === 'sku') {
        query.sku = { $regex: `${safeSearch}$`, $options: 'i' };
      } else if (searchField === 'title') {
        query.title = { $regex: safeSearch, $options: 'i' };
      } else {
        query.$or = [
          { title: { $regex: safeSearch, $options: 'i' } },
          { sku: { $regex: safeSearch, $options: 'i' } }
        ];
      }
    }


    console.log(query);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('GetAllProducts Error:', error);
    return res.status(500).json({
      message: "Serverda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring!",
      error: error.message
    });
  }
};

export const UpdateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return sendErrorResponse(res, 404, "Маҳсулот топилмади!");
    }

    // 🔒 COUNT
    if (req.body.count !== undefined) {
      const raw = req.body.count;
      const parsed = typeof raw === "object"
        ? Number(raw.count)
        : Number(raw);

      if (isNaN(parsed)) {
        return sendErrorResponse(res, 400, "count нотўғри форматда!");
      }

      product.count = parsed;
    }

    // 🔹 boshqa maydonlar
    const allowedFields = [
      "title",
      "price",
      "category",
      "season",
      "material",
      "gender",
      "mainImages",
      "status"
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    return res.json({
      message: "Маҳсулот муваффақиятли янгиланди ✅",
      data: product
    });

  } catch (error) {
    console.error("UpdateProduct Error:", error);
    return sendErrorResponse(res, 500, "Сервер хатолиги!");
  }
};


export const DeleteProduct = async (req, res) => {
  const { id } = req.params
  try {
    const deletedProduct = await Product.findByIdAndDelete(id)
    if (!deletedProduct) {
      return sendErrorResponse(res, 404, 'Mahsulot topilmadi.')
    }
    return res
      .status(200)
      .json({ message: 'Mahsulot muvaffaqiyatli o‘chirildi.' })
  } catch (error) {
    if (error.name === 'CastError') {  // error.title emas, error.name bo‘lishi kerak
      return sendErrorResponse(res, 400, 'Noto‘g‘ri mahsulot ID si.')
    }
    return sendErrorResponse(
      res,
      500,
      'Serverda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring!',
      error
    )
  }
}


export const Scanner = async (req, res) => {
  const { id } = req.params
  try {
    const product = await Product.findOne({ sku: id })
    if (!product) {
      return sendErrorResponse(res, 404, 'топилмади!')
    }
    return res.status(200).json({ product })
  } catch (error) {
    console.log(error);
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    )
  }
}

export const CheckSku = async (req, res) => {
  try {
    const { sku } = req.query;

    if (!sku) {
      return res.status(400).json({
        message: "SKU юборилмади",
      });
    }

    // 🔹 Async query uchun await kerak
    const product = await Product.findOne({ sku });

    if (!product) {
      return res.status(404).json({
        message: "Топилмади",
      });
    }

    return res.status(200).json({
      sku,
      product
    });

  } catch (error) {
    console.error("CheckSku error:", error);
    return res.status(500).json({
      message: "Серверда хатолик юз берди!",
    });
  }
};
