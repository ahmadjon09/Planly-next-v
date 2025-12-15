import Product from '../models/product.js'
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'
export function generateSKU() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomLetter1 = letters[Math.floor(Math.random() * letters.length)];
  const randomLetter2 = letters[Math.floor(Math.random() * letters.length)];
  const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6 xonali raqam

  return `${randomLetter1}${randomNumber}${randomLetter2}`;
}

export const CreateNewProduct = async (req, res) => {
  try {
    const data = req.body;

    // SKU avtomatik yaratiladi
    const autoSKU = generateSKU();

    const newProduct = await Product.create({
      title: data.title,
      // sku: autoSKU,
      price: data.price,
      category: data.category,
      gender: data.gender,
      season: data.season,
      material: data.material,
      mainImages: data.mainImages || [],
      description: data.description || "",
      types: data.types || [],
    });

    return res.status(201).json({
      message: "Mahsulot muvaffaqiyatli yaratildi ✅",
      product: newProduct
    });

  } catch (error) {
    console.error("CreateNewProduct error:", error);
    return res.status(500).json({
      message: "Serverda xatolik yuz berdi!",
      error: error.message
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
      if (searchField === 'sku') {
        query.sku = search;
      }
      else if (searchField === 'title') {
        query.title = { $regex: search, $options: 'i' };
      }
      else {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }
    }

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

    if (req.body.price === 0) {
      delete req.body.price;
    }

    if (req.body.title) {
      req.body.normalizedTitle = normalize(req.body.title);
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Mahsulot topilmadi." });
    }

    Object.assign(product, req.body);
    const updatedProduct = await product.save();

    return res.status(200).json({
      message: "Mahsulot muvaffaqiyatli yangilandi ✅",
      data: updatedProduct
    });

  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto‘g‘ri mahsulot ID si." });
    }

    console.error("UpdateProduct Error:", error);
    return res.status(500).json({
      message: "Serverda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring!",
      error: error.message
    });
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
    return res.status(200).json({ data: product })
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