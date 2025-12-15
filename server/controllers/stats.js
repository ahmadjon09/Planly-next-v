import History from '../models/history.js';
import Product from '../models/product.js';
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js';

// 🔹 Product sotishda avtomatik tarix yozish (Order controller'ida ishlatish uchun)
export const recordProductSale = async (productId, variant, quantity) => {
    try {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Tarixda bor yoki yo'qligini tekshirish
        let history = await History.findOne({
            product: productId,
            "variant.color": variant.color,
            "variant.size": variant.size,
            "variant.style": variant.style,
            month: month
        });

        if (history) {
            // Mavjud bo'lsa, yangilash
            history.soldCount += quantity;
            await history.save();
        } else {
            // Yangi yaratish
            history = await History.create({
                product: productId,
                variant: {
                    color: variant.color,
                    size: variant.size,
                    style: variant.style
                },
                soldCount: quantity,
                month: month
            });
        }

        return history;
    } catch (error) {
        console.error('❌ Tarix yozishda xatolik:', error);
        throw error;
    }
};

// 🔹 Order bekor qilinganda tarixni tuzatish
export const revertProductSale = async (productId, variant, quantity) => {
    try {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const history = await History.findOne({
            product: productId,
            "variant.color": variant.color,
            "variant.size": variant.size,
            "variant.style": variant.style,
            month: month
        });

        if (history) {
            history.soldCount = Math.max(0, history.soldCount - quantity);

            if (history.soldCount === 0) {
                await history.deleteOne();
            } else {
                await history.save();
            }
        }

        return history;
    } catch (error) {
        console.error('❌ Tarixni tuzatishda xatolik:', error);
        throw error;
    }
};

// 🔹 Order controller'larini yangilash (tarix bilan ishlash uchun)

// NewOrder controller'ida:
export const NewOrder = async (req, res) => {
    try {
        // ... oldingi kodlar

        // 🔹 Stock (count) larni kamaytirish VA tarix yozish
        for (const item of products) {
            const product = await Product.findById(item.product);
            const variantIndex = product.types.findIndex(t =>
                t.color === item.variant.color &&
                t.size === item.variant.size &&
                t.style === item.variant.style
            );

            if (variantIndex !== -1) {
                // Stock ni kamaytirish
                product.types[variantIndex].count -= item.quantity;
                product.sold += item.quantity;
                await product.save();

                // 🔹 Tarixga yozish
                await recordProductSale(
                    item.product,
                    item.variant,
                    item.quantity
                );
            }
        }

        // ... qolgan kodlar
    } catch (error) {
        // ... error handling
    }
};

// CancelOrder controller'ida:
export const CancelOrder = async (req, res) => {
    try {
        // ... oldingi kodlar

        // 🔹 Stock (count) larni qaytarish VA tarixni tuzatish
        for (const item of order.products) {
            const product = await Product.findById(item.product);
            if (product && product.types[item.variantIndex]) {
                // Stock ni qaytarish
                product.types[item.variantIndex].count += item.quantity;
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

        // ... qolgan kodlar
    } catch (error) {
        // ... error handling
    }
};

// 🔹 STATISTIKA CONTROLLER'LARI

// 1. MAHSULOT BO'YICHA SOTUV STATISTIKASI
export const getProductSalesStats = async (req, res) => {
    try {
        const { productId, year, month, limit = 10 } = req.query;

        let matchStage = {};

        if (productId) {
            matchStage.product = new mongoose.Types.ObjectId(productId);
        }

        if (year && month) {
            matchStage.month = `${year}-${month.padStart(2, '0')}`;
        } else if (year) {
            matchStage.month = { $regex: `^${year}-` };
        }

        const stats = await History.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        product: "$product",
                        color: "$variant.color",
                        size: "$variant.size",
                        style: "$variant.style",
                        month: "$month"
                    },
                    totalSold: { $sum: "$soldCount" },
                    recordsCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $project: {
                    _id: 0,
                    productId: "$_id.product",
                    productTitle: "$productInfo.title",
                    color: "$_id.color",
                    size: "$_id.size",
                    style: "$_id.style",
                    month: "$_id.month",
                    totalSold: 1,
                    recordsCount: 1,
                    mainImage: { $arrayElemAt: ["$productInfo.mainImages", 0] }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: parseInt(limit) }
        ]);

        return res.status(200).json({
            success: true,
            data: stats,
            total: stats.length
        });

    } catch (error) {
        console.error('❌ Statistika olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Statistika olishda xatolik');
    }
};

// 2. OYLIK SOTUV STATISTIKASI
export const getMonthlySalesStats = async (req, res) => {
    try {
        const { year, groupBy = 'month' } = req.query;

        let matchStage = {};
        let groupStage = {};

        if (year) {
            matchStage.month = { $regex: `^${year}-` };
        }

        if (groupBy === 'month') {
            groupStage = {
                _id: "$month",
                totalSales: { $sum: "$soldCount" },
                uniqueProducts: { $addToSet: "$product" },
                transactions: { $sum: 1 }
            };
        } else if (groupBy === 'product') {
            groupStage = {
                _id: "$product",
                totalSales: { $sum: "$soldCount" },
                monthsActive: { $addToSet: "$month" },
                variantsSold: {
                    $addToSet: {
                        color: "$variant.color",
                        size: "$variant.size",
                        style: "$variant.style"
                    }
                }
            };
        }

        const stats = await History.aggregate([
            { $match: matchStage },
            { $group: groupStage },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            {
                $project: {
                    _id: 1,
                    totalSales: 1,
                    ...(groupBy === 'month' ? {
                        uniqueProductsCount: { $size: "$uniqueProducts" },
                        transactions: 1
                    } : {
                        productTitle: { $arrayElemAt: ["$productInfo.title", 0] },
                        monthsActiveCount: { $size: "$monthsActive" },
                        variantsCount: { $size: "$variantsSold" }
                    })
                }
            },
            { $sort: { totalSales: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            data: stats,
            groupBy: groupBy
        });

    } catch (error) {
        console.error('❌ Oylik statistika olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Oylik statistika olishda xatolik');
    }
};

// 3. ENG KO'P SOTILADIGAN VARIANTLAR
export const getTopVariants = async (req, res) => {
    try {
        const { limit = 5, period = 'all' } = req.query;
        const now = new Date();

        let matchStage = {};

        if (period === 'currentMonth') {
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            matchStage.month = currentMonth;
        } else if (period === 'currentYear') {
            matchStage.month = { $regex: `^${now.getFullYear()}-` };
        } else if (period === 'lastMonth') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
            matchStage.month = lastMonthStr;
        }

        const topVariants = await History.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        product: "$product",
                        color: "$variant.color",
                        size: "$variant.size",
                        style: "$variant.style"
                    },
                    totalSold: { $sum: "$soldCount" },
                    monthsActive: { $addToSet: "$month" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $project: {
                    _id: 0,
                    productId: "$_id.product",
                    productTitle: "$productInfo.title",
                    color: "$_id.color",
                    size: "$_id.size",
                    style: "$_id.style",
                    totalSold: 1,
                    monthsActiveCount: { $size: "$monthsActive" },
                    avgMonthlySales: { $divide: ["$totalSold", { $size: "$monthsActive" }] },
                    mainImage: { $arrayElemAt: ["$productInfo.mainImages", 0] },
                    category: "$productInfo.category",
                    gender: "$productInfo.gender"
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: parseInt(limit) }
        ]);

        return res.status(200).json({
            success: true,
            data: topVariants,
            period: period,
            totalVariants: topVariants.length
        });

    } catch (error) {
        console.error('❌ Top variantlarni olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Top variantlarni olishda xatolik');
    }
};

// 4. VAQT ORALIĞI BO'YICHA SOTUV TRENDI
export const getSalesTrend = async (req, res) => {
    try {
        const { startDate, endDate, interval = 'monthly' } = req.query;

        let matchStage = {};
        let groupStage = {};
        let sortStage = { _id: 1 };

        // Sanalarni formatlash
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            const startMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
            const endMonth = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;

            matchStage.month = { $gte: startMonth, $lte: endMonth };
        }

        // Interval bo'yicha gruppalash
        if (interval === 'monthly') {
            groupStage = {
                _id: "$month",
                totalSales: { $sum: "$soldCount" },
                uniqueProducts: { $addToSet: "$product" },
                totalTransactions: { $sum: 1 }
            };
        } else if (interval === 'quarterly') {
            groupStage = {
                _id: {
                    year: { $substr: ["$month", 0, 4] },
                    quarter: {
                        $switch: {
                            branches: [
                                { case: { $in: [{ $substr: ["$month", 5, 2] }, ["01", "02", "03"]] }, then: "Q1" },
                                { case: { $in: [{ $substr: ["$month", 5, 2] }, ["04", "05", "06"]] }, then: "Q2" },
                                { case: { $in: [{ $substr: ["$month", 5, 2] }, ["07", "08", "09"]] }, then: "Q3" },
                                { case: { $in: [{ $substr: ["$month", 5, 2] }, ["10", "11", "12"]] }, then: "Q4" }
                            ],
                            default: "Unknown"
                        }
                    }
                },
                totalSales: { $sum: "$soldCount" },
                uniqueProducts: { $addToSet: "$product" },
                months: { $addToSet: "$month" }
            };
            sortStage = { "_id.year": 1, "_id.quarter": 1 };
        } else if (interval === 'yearly') {
            groupStage = {
                _id: { $substr: ["$month", 0, 4] },
                totalSales: { $sum: "$soldCount" },
                uniqueProducts: { $addToSet: "$product" },
                monthsActive: { $addToSet: "$month" }
            };
        }

        const trend = await History.aggregate([
            { $match: matchStage },
            { $group: groupStage },
            {
                $project: {
                    period: "$_id",
                    totalSales: 1,
                    uniqueProductsCount: { $size: "$uniqueProducts" },
                    ...(interval === 'monthly' && { transactions: "$totalTransactions" }),
                    ...(interval === 'quarterly' && { monthsCount: { $size: "$months" } }),
                    ...(interval === 'yearly' && { monthsCount: { $size: "$monthsActive" } }),
                    averageMonthlySales: {
                        $cond: {
                            if: { $eq: [interval, 'yearly'] },
                            then: { $divide: ["$totalSales", { $size: "$monthsActive" }] },
                            else: null
                        }
                    }
                }
            },
            { $sort: sortStage }
        ]);

        return res.status(200).json({
            success: true,
            data: trend,
            interval: interval,
            totalPeriods: trend.length
        });

    } catch (error) {
        console.error('❌ Trend olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Trend olishda xatolik');
    }
};

// 5. CATEGORY/GENDER/SEASON BO'YICHA STATISTIKA
export const getCategoryStats = async (req, res) => {
    try {
        const { by = 'category', year } = req.query;

        let matchStage = {};
        if (year) {
            matchStage.month = { $regex: `^${year}-` };
        }

        const stats = await History.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: "products",
                    localField: "product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: `$${by === 'category' ? 'productInfo.category' :
                        by === 'gender' ? 'productInfo.gender' :
                            by === 'season' ? 'productInfo.season' : 'productInfo.category'}`,
                    totalSales: { $sum: "$soldCount" },
                    totalRevenue: {
                        $sum: { $multiply: ["$soldCount", "$productInfo.price"] }
                    },
                    uniqueProducts: { $addToSet: "$product" },
                    uniqueVariants: {
                        $addToSet: {
                            product: "$product",
                            color: "$variant.color",
                            size: "$variant.size"
                        }
                    }
                }
            },
            {
                $project: {
                    category: "$_id",
                    totalSales: 1,
                    totalRevenue: 1,
                    uniqueProductsCount: { $size: "$uniqueProducts" },
                    uniqueVariantsCount: { $size: "$uniqueVariants" },
                    avgProductValue: { $divide: ["$totalRevenue", { $size: "$uniqueProducts" }] }
                }
            },
            { $sort: { totalSales: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            data: stats,
            groupedBy: by,
            totalGroups: stats.length
        });

    } catch (error) {
        console.error('❌ Kategoriya statistikasini olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Kategoriya statistikasini olishda xatolik');
    }
};

// 6. DETAILED PRODUCT HISTORY
export const getProductDetailedHistory = async (req, res) => {
    try {
        const { productId } = req.params;

        const history = await History.find({ product: productId })
            .sort({ month: -1 })
            .populate('product', 'title category gender price mainImages');

        // Gruppalash variantlar bo'yicha
        const variantStats = await History.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: {
                        color: "$variant.color",
                        size: "$variant.size",
                        style: "$variant.style"
                    },
                    totalSold: { $sum: "$soldCount" },
                    monthsActive: { $addToSet: "$month" },
                    firstSale: { $min: "$month" },
                    lastSale: { $max: "$month" }
                }
            },
            {
                $project: {
                    variant: "$_id",
                    totalSold: 1,
                    monthsActiveCount: { $size: "$monthsActive" },
                    firstSale: 1,
                    lastSale: 1,
                    avgMonthlySales: { $divide: ["$totalSold", { $size: "$monthsActive" }] }
                }
            },
            { $sort: { totalSold: -1 } }
        ]);

        // Oylik statistikani hisoblash
        const monthlyStats = await History.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: "$month",
                    totalSold: { $sum: "$soldCount" },
                    uniqueVariants: {
                        $addToSet: {
                            color: "$variant.color",
                            size: "$variant.size",
                            style: "$variant.style"
                        }
                    }
                }
            },
            {
                $project: {
                    month: "$_id",
                    totalSold: 1,
                    uniqueVariantsCount: { $size: "$uniqueVariants" },
                    averagePerVariant: { $divide: ["$totalSold", { $size: "$uniqueVariants" }] }
                }
            },
            { $sort: { month: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                rawHistory: history,
                variantStats,
                monthlyStats,
                summary: {
                    totalMonths: monthlyStats.length,
                    totalVariants: variantStats.length,
                    totalSold: variantStats.reduce((sum, v) => sum + v.totalSold, 0),
                    bestVariant: variantStats[0],
                    bestMonth: monthlyStats[0]
                }
            }
        });

    } catch (error) {
        console.error('❌ Detalli tarixni olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Detalli tarixni olishda xatolik');
    }
};

