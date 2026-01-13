// controllers/historyController.js
import mongoose from "mongoose";
import Order from '../models/order.js';
import Product from '../models/product.js';
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js';

// ========== DINAMIK STATISTIKA FUNKSIYALARI ==========

// 1. MAHSULOT BO'YICHA SOTUV STATISTIKASI
export const getProductSalesStats = async (req, res) => {
    try {
        const { productId, startDate, endDate, limit = 10 } = req.query;

        let matchStage = {
            status: { $in: ["delivered", "completed"] }
        };

        if (productId) {
            matchStage["products.product"] = new mongoose.Types.ObjectId(productId);
        }

        // Sanalar filteri
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const stats = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    totalSold: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                    orderCount: { $sum: 1 },
                    avgPrice: { $avg: "$products.price" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    productTitle: "$productInfo.title",
                    productSku: "$productInfo.sku",
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    avgPrice: 1,
                    avgOrderQuantity: { $divide: ["$totalSold", "$orderCount"] },
                    mainImage: { $arrayElemAt: ["$productInfo.mainImages", 0] },
                    category: "$productInfo.category",
                    gender: "$productInfo.gender",
                    sizes: "$productInfo.sizes",
                    season: "$productInfo.season",
                    count: "$productInfo.count",
                    isAvailable: "$productInfo.isAvailable"
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
        const { year, month, groupBy = 'month', limit = 12 } = req.query;

        let matchStage = {
            status: { $in: ["delivered", "completed"] }
        };

        // Yil va oy filteri
        if (year) {
            const startDate = new Date(`${year}-01-01`);
            const endDate = new Date(`${parseInt(year) + 1}-01-01`);
            matchStage.createdAt = { $gte: startDate, $lt: endDate };
        }

        if (month) {
            const [year, monthNum] = month.split('-');
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
            matchStage.createdAt = { $gte: startDate, $lte: endDate };
        }

        if (groupBy === 'month') {
            const stats = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        totalRevenue: { $sum: "$total" },
                        totalItems: { $sum: { $size: "$products" } },
                        orderCount: { $sum: 1 },
                        uniqueProducts: { $addToSet: "$products.product" },
                        avgOrderValue: { $avg: "$total" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        year: "$_id.year",
                        month: "$_id.month",
                        period: {
                            $concat: [
                                { $toString: "$_id.year" },
                                "-",
                                { $toString: { $cond: { if: { $lt: ["$_id.month", 10] }, then: { $concat: ["0", { $toString: "$_id.month" }] }, else: { $toString: "$_id.month" } } } }
                            ]
                        },
                        totalRevenue: 1,
                        totalItems: 1,
                        orderCount: 1,
                        uniqueProductsCount: { $size: "$uniqueProducts" },
                        avgOrderValue: 1
                    }
                },
                { $sort: { year: 1, month: 1 } },
                { $limit: parseInt(limit) }
            ]);

            return res.status(200).json({
                success: true,
                data: stats,
                groupBy: groupBy
            });
        }
        else if (groupBy === 'product') {
            const stats = await Order.aggregate([
                { $match: matchStage },
                { $unwind: "$products" },
                {
                    $group: {
                        _id: "$products.product",
                        totalSold: { $sum: "$products.quantity" },
                        totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                        orderCount: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "_id",
                        as: "productInfo"
                    }
                },
                { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        productId: "$_id",
                        productTitle: "$productInfo.title",
                        productSku: "$productInfo.sku",
                        totalSold: 1,
                        totalRevenue: 1,
                        orderCount: 1,
                        avgSalePerOrder: { $divide: ["$totalSold", "$orderCount"] },
                        category: "$productInfo.category",
                        mainImage: { $arrayElemAt: ["$productInfo.mainImages", 0] }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: parseInt(limit) }
            ]);

            return res.status(200).json({
                success: true,
                data: stats,
                groupBy: groupBy
            });
        }

    } catch (error) {
        console.error('❌ Oylik statistika olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Oylik statistika olishda xatolik');
    }
};

// 3. ENG KO'P SOTILADIGAN MAHSULOTLAR
export const getTopProducts = async (req, res) => {
    try {
        const { limit = 10, period = 'all', startDate, endDate } = req.query;

        let matchStage = {
            status: { $in: ["delivered", "completed"] }
        };

        const now = new Date();

        if (period === 'today') {
            const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            matchStage.createdAt = { $gte: startDate, $lt: endDate };
        } else if (period === 'yesterday') {
            const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            matchStage.createdAt = { $gte: startDate, $lt: endDate };
        } else if (period === 'thisWeek') {
            const startDate = new Date(now.setDate(now.getDate() - now.getDay()));
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            matchStage.createdAt = { $gte: startDate, $lt: endDate };
        } else if (period === 'lastWeek') {
            const startDate = new Date(now.setDate(now.getDate() - now.getDay() - 7));
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            matchStage.createdAt = { $gte: startDate, $lt: endDate };
        } else if (period === 'thisMonth') {
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            matchStage.createdAt = { $gte: startDate, $lte: endDate };
        } else if (period === 'lastMonth') {
            const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            matchStage.createdAt = { $gte: startDate, $lte: endDate };
        } else if (period === 'thisYear') {
            const startDate = new Date(now.getFullYear(), 0, 1);
            const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            matchStage.createdAt = { $gte: startDate, $lte: endDate };
        }

        // Custom date range
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const topProducts = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    totalSold: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                    orderCount: { $sum: 1 },
                    avgPrice: { $avg: "$products.price" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    productTitle: "$productInfo.title",
                    productSku: "$productInfo.sku",
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    avgPrice: 1,
                    avgSalePerOrder: { $divide: ["$totalSold", "$orderCount"] },
                    category: "$productInfo.category",
                    gender: "$productInfo.gender",
                    sizes: "$productInfo.sizes",
                    season: "$productInfo.season",
                    count: "$productInfo.count",
                    isAvailable: "$productInfo.isAvailable",
                    mainImage: { $arrayElemAt: ["$productInfo.mainImages", 0] }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: parseInt(limit) }
        ]);

        return res.status(200).json({
            success: true,
            data: topProducts,
            period: period,
            totalProducts: topProducts.length,
            totalSold: topProducts.reduce((sum, item) => sum + item.totalSold, 0),
            totalRevenue: topProducts.reduce((sum, item) => sum + item.totalRevenue, 0)
        });

    } catch (error) {
        console.error('❌ Top mahsulotlarni olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Top mahsulotlarni olishda xatolik');
    }
};

// 4. VAQT ORALIĞI BO'YICHA SOTUV TRENDI
export const getSalesTrend = async (req, res) => {
    try {
        const { startDate, endDate, interval = 'monthly' } = req.query;

        let matchStage = {
            status: { $in: ["delivered", "completed"] }
        };

        // Sanalar filteri
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        } else {
            // Default: oxirgi 12 oy
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 12);
            matchStage.createdAt = { $gte: startDate, $lte: endDate };
        }

        let groupStage = {};
        let projectStage = {};
        let sortStage = {};

        if (interval === 'daily') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                },
                totalRevenue: { $sum: "$total" },
                totalItems: { $sum: { $size: "$products" } },
                orderCount: { $sum: 1 },
                totalSold: {
                    $sum: {
                        $reduce: {
                            input: "$products",
                            initialValue: 0,
                            in: { $add: ["$$value", "$$this.quantity"] }
                        }
                    }
                }
            };
            projectStage = {
                _id: 0,
                date: {
                    $dateFromParts: {
                        year: "$_id.year",
                        month: "$_id.month",
                        day: "$_id.day"
                    }
                },
                period: {
                    $concat: [
                        { $toString: "$_id.day" },
                        ".",
                        { $toString: "$_id.month" },
                        ".",
                        { $toString: "$_id.year" }
                    ]
                },
                totalRevenue: 1,
                totalItems: 1,
                totalSold: 1,
                orderCount: 1,
                avgOrderValue: { $divide: ["$totalRevenue", "$orderCount"] }
            };
            sortStage = { date: 1 };
        }
        else if (interval === 'weekly') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" },
                    week: { $week: "$createdAt" }
                },
                totalRevenue: { $sum: "$total" },
                totalItems: { $sum: { $size: "$products" } },
                orderCount: { $sum: 1 }
            };
            projectStage = {
                _id: 0,
                week: "$_id.week",
                year: "$_id.year",
                period: {
                    $concat: [
                        { $toString: "$_id.year" },
                        "-W",
                        { $toString: "$_id.week" }
                    ]
                },
                totalRevenue: 1,
                totalItems: 1,
                orderCount: 1,
                avgDailySales: { $divide: ["$totalRevenue", 7] }
            };
            sortStage = { year: 1, week: 1 };
        }
        else if (interval === 'monthly') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                totalRevenue: { $sum: "$total" },
                totalItems: { $sum: { $size: "$products" } },
                orderCount: { $sum: 1 },
                totalSold: {
                    $sum: {
                        $reduce: {
                            input: "$products",
                            initialValue: 0,
                            in: { $add: ["$$value", "$$this.quantity"] }
                        }
                    }
                }
            };
            projectStage = {
                _id: 0,
                year: "$_id.year",
                month: "$_id.month",
                period: {
                    $concat: [
                        { $toString: "$_id.year" },
                        "-",
                        { $toString: { $cond: { if: { $lt: ["$_id.month", 10] }, then: { $concat: ["0", { $toString: "$_id.month" }] }, else: { $toString: "$_id.month" } } } }
                    ]
                },
                totalRevenue: 1,
                totalItems: 1,
                totalSold: 1,
                orderCount: 1,
                avgOrderValue: { $divide: ["$totalRevenue", "$orderCount"] },
                avgItemsPerOrder: { $divide: ["$totalItems", "$orderCount"] }
            };
            sortStage = { year: 1, month: 1 };
        }
        else if (interval === 'yearly') {
            groupStage = {
                _id: { $year: "$createdAt" },
                totalRevenue: { $sum: "$total" },
                totalItems: { $sum: { $size: "$products" } },
                orderCount: { $sum: 1 }
            };
            projectStage = {
                _id: 0,
                year: "$_id",
                period: { $toString: "$_id" },
                totalRevenue: 1,
                totalItems: 1,
                orderCount: 1,
                avgMonthlyRevenue: { $divide: ["$totalRevenue", 12] }
            };
            sortStage = { year: 1 };
        }

        const trend = await Order.aggregate([
            { $match: matchStage },
            { $group: groupStage },
            { $project: projectStage },
            { $sort: sortStage }
        ]);

        // Trend analysis
        const analysis = {
            totalPeriods: trend.length,
            totalRevenue: trend.reduce((sum, item) => sum + item.totalRevenue, 0),
            totalOrders: trend.reduce((sum, item) => sum + item.orderCount, 0),
            averageRevenue: trend.length > 0 ? trend.reduce((sum, item) => sum + item.totalRevenue, 0) / trend.length : 0,
            bestPeriod: trend.reduce((best, current) => current.totalRevenue > best.totalRevenue ? current : trend[0], trend[0] || {}),
            worstPeriod: trend.reduce((worst, current) => current.totalRevenue < worst.totalRevenue ? current : trend[0], trend[0] || {})
        };

        return res.status(200).json({
            success: true,
            data: trend,
            analysis: analysis,
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
        const { by = 'category', startDate, endDate } = req.query;

        let matchStage = {
            status: { $in: ["delivered", "completed"] }
        };

        // Sanalar filteri
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const stats = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products",
                    localField: "products.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: by === 'category' ? "$productInfo.category" :
                        by === 'gender' ? "$productInfo.gender" :
                            by === 'season' ? "$productInfo.season" : "$productInfo.category",
                    totalSold: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                    uniqueProducts: { $addToSet: "$products.product" },
                    orderCount: { $sum: 1 },
                    avgPrice: { $avg: "$products.price" }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: "$_id",
                    totalSold: 1,
                    totalRevenue: 1,
                    uniqueProductsCount: { $size: "$uniqueProducts" },
                    orderCount: 1,
                    avgPrice: 1,
                    avgSoldPerProduct: { $divide: ["$totalSold", { $size: "$uniqueProducts" }] },
                    avgRevenuePerProduct: { $divide: ["$totalRevenue", { $size: "$uniqueProducts" }] },
                    percentage: 0 // Keyin hisoblanadi
                }
            },
            { $sort: { totalSold: -1 } }
        ]);

        // Percentage hisoblash
        const totalSold = stats.reduce((sum, item) => sum + item.totalSold, 0);
        const totalRevenue = stats.reduce((sum, item) => sum + item.totalRevenue, 0);

        const statsWithPercentage = stats.map(item => ({
            ...item,
            percentage: totalSold > 0 ? (item.totalSold / totalSold * 100).toFixed(1) : 0,
            revenuePercentage: totalRevenue > 0 ? (item.totalRevenue / totalRevenue * 100).toFixed(1) : 0
        }));

        return res.status(200).json({
            success: true,
            data: statsWithPercentage,
            groupedBy: by,
            totalGroups: stats.length,
            summary: {
                totalSold,
                totalRevenue,
                totalProducts: stats.reduce((sum, item) => sum + item.uniqueProductsCount, 0),
                totalOrders: stats.reduce((sum, item) => sum + item.orderCount, 0)
            }
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
        const { startDate, endDate } = req.query;

        let matchStage = {
            status: { $in: ["delivered", "completed"] },
            "products.product": new mongoose.Types.ObjectId(productId)
        };

        // Sanalar filteri
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        // Mahsulot ma'lumotlarini olish
        const product = await Product.findById(productId)
            .select('title sku category gender sizes season mainImages count material isAvailable')
            .lean();

        if (!product) {
            return sendErrorResponse(res, 404, 'Mahsulot topilmadi');
        }

        // Umumiy statistika
        const generalStats = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$products" },
            { $match: { "products.product": new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: null,
                    totalSold: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                    orderCount: { $sum: 1 },
                    avgPrice: { $avg: "$products.price" },
                    minPrice: { $min: "$products.price" },
                    maxPrice: { $max: "$products.price" },
                    firstSale: { $min: "$createdAt" },
                    lastSale: { $max: "$createdAt" }
                }
            }
        ]);

        // Oylik statistika
        const monthlyStats = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$products" },
            { $match: { "products.product": new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    totalSold: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                    orderCount: { $sum: 1 },
                    avgPrice: { $avg: "$products.price" }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                    period: {
                        $concat: [
                            { $toString: "$_id.year" },
                            "-",
                            { $toString: { $cond: { if: { $lt: ["$_id.month", 10] }, then: { $concat: ["0", { $toString: "$_id.month" }] }, else: { $toString: "$_id.month" } } } }
                        ]
                    },
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    avgPrice: 1,
                    avgSalePerOrder: { $divide: ["$totalSold", "$orderCount"] }
                }
            },
            { $sort: { year: -1, month: -1 } }
        ]);

        // Kundalik statistika (oxirgi 30 kun)
        const dailyStats = await Order.aggregate([
            {
                $match: {
                    ...matchStage,
                    createdAt: {
                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            { $unwind: "$products" },
            { $match: { "products.product": new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    totalSold: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1
                }
            },
            { $sort: { date: -1 } }
        ]);

        // So'nggi 10 ta order
        const recentOrders = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$products" },
            { $match: { "products.product": new mongoose.Types.ObjectId(productId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "customer",
                    foreignField: "_id",
                    as: "customerInfo"
                }
            },
            {
                $project: {
                    _id: 1,
                    orderNumber: "$_id",
                    orderDate: "$createdAt",
                    quantity: "$products.quantity",
                    price: "$products.price",
                    total: { $multiply: ["$products.price", "$products.quantity"] },
                    status: 1,
                    customerName: { $arrayElemAt: ["$customerInfo.name", 0] },
                    customerPhone: { $arrayElemAt: ["$customerInfo.phone", 0] }
                }
            },
            { $sort: { orderDate: -1 } },
            { $limit: 10 }
        ]);

        const stats = generalStats[0] || {
            totalSold: 0,
            totalRevenue: 0,
            orderCount: 0,
            avgPrice: 0,
            minPrice: 0,
            maxPrice: 0,
            firstSale: null,
            lastSale: null
        };

        // Progress calculation
        const progress = {
            soldVsStock: product.count > 0 ? (stats.totalSold / (stats.totalSold + product.count) * 100).toFixed(1) : 100,
            revenuePerItem: stats.totalSold > 0 ? stats.totalRevenue / stats.totalSold : 0,
            salesVelocity: monthlyStats.length > 0 ? stats.totalSold / monthlyStats.length : 0
        };

        return res.status(200).json({
            success: true,
            data: {
                productInfo: product,
                summary: {
                    totalSold: stats.totalSold,
                    totalRevenue: stats.totalRevenue,
                    totalOrders: stats.orderCount,
                    avgPrice: stats.avgPrice,
                    minPrice: stats.minPrice,
                    maxPrice: stats.maxPrice,
                    firstSale: stats.firstSale,
                    lastSale: stats.lastSale,
                    avgSalePerOrder: stats.orderCount > 0 ? stats.totalSold / stats.orderCount : 0,
                    daysSinceFirstSale: stats.firstSale ? Math.floor((new Date() - new Date(stats.firstSale)) / (1000 * 60 * 60 * 24)) : 0
                },
                progress,
                monthlyStats,
                dailyStats,
                recentOrders,
                analysis: {
                    bestMonth: monthlyStats.length > 0 ? monthlyStats.reduce((best, current) => current.totalSold > best.totalSold ? current : monthlyStats[0], monthlyStats[0]) : null,
                    worstMonth: monthlyStats.length > 0 ? monthlyStats.reduce((worst, current) => current.totalSold < worst.totalSold ? current : monthlyStats[0], monthlyStats[0]) : null,
                    trend: monthlyStats.length >= 2 ?
                        ((monthlyStats[0].totalSold - monthlyStats[1].totalSold) / monthlyStats[1].totalSold * 100).toFixed(1) : 0
                }
            }
        });

    } catch (error) {
        console.error('❌ Detalli tarixni olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Detalli tarixni olishda xatolik');
    }
};

// 7. UMUMIY STATISTIKA (DASHBOARD UCHUN) - YANGILANGAN
export const getDashboardStats = async (req, res) => {
    try {
        /* =======================
           DATE RANGES
        ======================== */
        const now = new Date();

        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);

        const lastWeekDate = new Date(todayDate);
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);

        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            0,
            23,
            59,
            59,
            999
        );

        /* =======================
           TODAY
        ======================== */
        const todayStats = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["delivered", "completed"] },
                    createdAt: { $gte: todayDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    orderCount: { $sum: 1 },
                    totalItems: { $sum: { $size: "$products" } },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: "$products",
                                initialValue: 0,
                                in: { $add: ["$$value", "$$this.quantity"] }
                            }
                        }
                    }
                }
            }
        ]);

        /* =======================
           YESTERDAY
        ======================== */
        const yesterdayStats = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["delivered", "completed"] },
                    createdAt: { $gte: yesterdayDate, $lt: todayDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    orderCount: { $sum: 1 },
                    totalItems: { $sum: { $size: "$products" } },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: "$products",
                                initialValue: 0,
                                in: { $add: ["$$value", "$$this.quantity"] }
                            }
                        }
                    }
                }
            }
        ]);

        /* =======================
           LAST WEEK
        ======================== */
        const lastWeekStats = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["delivered", "completed"] },
                    createdAt: { $gte: lastWeekDate, $lt: yesterdayDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    orderCount: { $sum: 1 },
                    totalItems: { $sum: { $size: "$products" } }
                }
            }
        ]);

        /* =======================
           CURRENT MONTH
        ======================== */
        const monthlyStats = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["delivered", "completed"] },
                    createdAt: { $gte: currentMonthStart }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    orderCount: { $sum: 1 },
                    totalItems: { $sum: { $size: "$products" } },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: "$products",
                                initialValue: 0,
                                in: { $add: ["$$value", "$$this.quantity"] }
                            }
                        }
                    }
                }
            }
        ]);

        /* =======================
           LAST MONTH
        ======================== */
        const lastMonthStats = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["delivered", "completed"] },
                    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    orderCount: { $sum: 1 },
                    totalItems: { $sum: { $size: "$products" } },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: "$products",
                                initialValue: 0,
                                in: { $add: ["$$value", "$$this.quantity"] }
                            }
                        }
                    }
                }
            }
        ]);

        /* =======================
           SAFE DATA
        ======================== */
        const todayData = todayStats[0] || { totalRevenue: 0, orderCount: 0, totalItems: 0, totalSold: 0 };
        const yesterdayData = yesterdayStats[0] || { totalRevenue: 0, orderCount: 0, totalItems: 0, totalSold: 0 };
        const lastWeekData = lastWeekStats[0] || { totalRevenue: 0, orderCount: 0, totalItems: 0 };
        const currentMonthData = monthlyStats[0] || { totalRevenue: 0, orderCount: 0, totalItems: 0, totalSold: 0 };
        const lastMonthData = lastMonthStats[0] || { totalRevenue: 0, orderCount: 0, totalItems: 0, totalSold: 0 };

        /* =======================
           CHANGE CALCULATOR
        ======================== */
        const calculateChange = (current, previous) => {
            if (!previous || previous === 0) {
                return { percentage: 0, trend: "neutral" };
            }

            const diff = ((current - previous) / previous) * 100;

            return {
                percentage: Math.abs(Number(diff.toFixed(1))),
                trend: diff > 0 ? "up" : diff < 0 ? "down" : "neutral"
            };
        };

        /* =======================
           RESPONSE
        ======================== */
        return res.status(200).json({
            success: true,
            data: {
                today: todayData,
                yesterday: yesterdayData,
                lastWeek: lastWeekData,
                currentMonth: currentMonthData,
                lastMonth: lastMonthData,
                changes: {
                    todayVsYesterday: {
                        revenue: calculateChange(todayData.totalRevenue, yesterdayData.totalRevenue),
                        orders: calculateChange(todayData.orderCount, yesterdayData.orderCount)
                    },
                    currentMonthVsLastMonth: {
                        revenue: calculateChange(currentMonthData.totalRevenue, lastMonthData.totalRevenue),
                        orders: calculateChange(currentMonthData.orderCount, lastMonthData.orderCount),
                        sold: calculateChange(currentMonthData.totalSold, lastMonthData.totalSold)
                    }
                }
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error("❌ Dashboard statistikasini olishda xatolik:", error);
        return res.status(500).json({
            success: false,
            message: "Dashboard statistikasini olishda xatolik"
        });
    }
};


// 8. MAHSULOTNING OYLIK STATISTIKASI
export const getProductMonthlyHistory = async (req, res) => {
    try {
        const { productId } = req.params;
        const { startDate, endDate, limit = 12 } = req.query;

        let matchStage = {
            status: { $in: ["delivered", "completed"] },
            "products.product": new mongoose.Types.ObjectId(productId)
        };

        // Sanalar filteri
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const monthlyStats = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$products" },
            { $match: { "products.product": new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    totalSold: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
                    orderCount: { $sum: 1 },
                    avgPrice: { $avg: "$products.price" },
                    minPrice: { $min: "$products.price" },
                    maxPrice: { $max: "$products.price" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "products.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                    period: {
                        $concat: [
                            { $toString: "$_id.year" },
                            "-",
                            { $toString: { $cond: { if: { $lt: ["$_id.month", 10] }, then: { $concat: ["0", { $toString: "$_id.month" }] }, else: { $toString: "$_id.month" } } } }
                        ]
                    },
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    avgPrice: 1,
                    minPrice: 1,
                    maxPrice: 1,
                    productTitle: { $arrayElemAt: ["$productInfo.title", 0] },
                    productSku: { $arrayElemAt: ["$productInfo.sku", 0] },
                    avgSalePerOrder: { $divide: ["$totalSold", "$orderCount"] },
                    revenuePerItem: { $divide: ["$totalRevenue", "$totalSold"] }
                }
            },
            { $sort: { year: -1, month: -1 } },
            { $limit: parseInt(limit) }
        ]);

        const totalStats = monthlyStats.reduce((acc, month) => ({
            totalSold: acc.totalSold + month.totalSold,
            totalRevenue: acc.totalRevenue + month.totalRevenue,
            totalOrders: acc.totalOrders + month.orderCount
        }), { totalSold: 0, totalRevenue: 0, totalOrders: 0 });

        // Trend analysis
        let trend = 0;
        if (monthlyStats.length >= 2) {
            const current = monthlyStats[0];
            const previous = monthlyStats[1];
            trend = ((current.totalSold - previous.totalSold) / previous.totalSold * 100).toFixed(1);
        }

        return res.status(200).json({
            success: true,
            data: monthlyStats,
            summary: {
                totalMonths: monthlyStats.length,
                totalSold: totalStats.totalSold,
                totalRevenue: totalStats.totalRevenue,
                totalOrders: totalStats.totalOrders,
                averageMonthlySold: monthlyStats.length > 0 ? totalStats.totalSold / monthlyStats.length : 0,
                averageMonthlyRevenue: monthlyStats.length > 0 ? totalStats.totalRevenue / monthlyStats.length : 0,
                averageMonthlyOrders: monthlyStats.length > 0 ? totalStats.totalOrders / monthlyStats.length : 0,
                bestMonth: monthlyStats.length > 0 ? monthlyStats.reduce((best, current) => current.totalSold > best.totalSold ? current : monthlyStats[0], monthlyStats[0]) : null,
                worstMonth: monthlyStats.length > 0 ? monthlyStats.reduce((worst, current) => current.totalSold < worst.totalSold ? current : monthlyStats[0], monthlyStats[0]) : null,
                trend: trend
            }
        });

    } catch (error) {
        console.error('❌ Mahsulot oylik statistikasini olishda xatolik:', error);
        sendErrorResponse(res, 500, 'Mahsulot oylik statistikasini olishda xatolik');
    }
};